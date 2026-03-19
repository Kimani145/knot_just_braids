import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import formatBytes from '../../utils/formatBytes'
import { db } from '../../firebase'
import { ASSET_METADATA_COLLECTION } from '../../constants/catalog'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ImageUploader({ onUpload, resetSignal, selectedAsset = null }) {
  const inputRef = useRef(null)
  const previewUrlRef = useRef('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploadedAssetUrl, setUploadedAssetUrl] = useState('')

  useEffect(() => {
    previewUrlRef.current = previewUrl
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    if (resetSignal === undefined) return
    const currentPreviewUrl = previewUrlRef.current
    if (currentPreviewUrl && currentPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentPreviewUrl)
    }
    setPreviewUrl('')
    setFileName('')
    setUploadedAssetUrl('')
    setUploadError('')
    setIsDragging(false)
    setIsUploading(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [resetSignal])

  useEffect(() => {
    if (!selectedAsset) return

    const nextUrl = selectedAsset.assetUrl || selectedAsset.previewUrl || ''
    if (!nextUrl) return

    const currentPreviewUrl = previewUrlRef.current
    if (
      currentPreviewUrl &&
      currentPreviewUrl.startsWith('blob:') &&
      currentPreviewUrl !== nextUrl
    ) {
      URL.revokeObjectURL(currentPreviewUrl)
    }

    setPreviewUrl(nextUrl)
    setFileName(selectedAsset.fileName || 'Selected asset')
    setUploadedAssetUrl(nextUrl)
    setUploadError('')
    setIsUploading(false)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [selectedAsset])

  const uploadToCloudinary = async (file) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        'Missing Cloudinary env vars. Define VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.',
      )
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloudinary upload failed: ${errorText}`)
      }

      return response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setFileName(file.name)
    setUploadedAssetUrl('')
    setUploadError('')
    setIsUploading(true)

    try {
      const formattedFileSize = formatBytes(file.size)
      const cloudinaryResponse = await uploadToCloudinary(file)
      const assetUrl = cloudinaryResponse.secure_url

      if (!assetUrl) {
        throw new Error('Cloudinary upload succeeded without returning a secure URL.')
      }

      setUploadedAssetUrl(assetUrl)

      try {
        const docRef = await addDoc(collection(db, ASSET_METADATA_COLLECTION), {
          fileName: file.name,
          fileSize: formattedFileSize,
          mimeType: file.type,
          assetUrl,
          uploadedAt: serverTimestamp(),
        })

        console.log('Firestore Save Success:', docRef.id)
      } catch (error) {
        console.error('Firestore Save Failed:', error)
        setUploadError(
          'Image uploaded to Cloudinary, but Firestore metadata failed to save.',
        )
        return
      }

      const asset = {
        id: createId(),
        fileName: file.name,
        fileSize: formattedFileSize,
        mimeType: file.type,
        timestamp: new Date().toISOString(),
        previewUrl: assetUrl,
        assetUrl,
      }

      onUpload?.(asset)
    } catch (error) {
      console.error('Image upload failed:', error)
      setUploadError('Upload failed or timed out. Click to retry.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const handleBrowse = (event) => {
    handleFile(event.target.files?.[0])
  }

  const openFilePicker = () => {
    if (isUploading) return
    inputRef.current?.click()
  }

  const handleRemoveImage = (event) => {
    event.stopPropagation()
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    setFileName('')
    setUploadedAssetUrl('')
    setUploadError('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    onUpload?.(null)
  }

  const boxStyle = {
    border: `2px dashed ${isDragging ? 'var(--feed)' : 'var(--border)'}`,
    background: 'var(--surface2)',
    color: 'var(--muted)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem',
    textAlign: 'center',
    cursor: isUploading ? 'not-allowed' : 'pointer',
    transition: 'border-color var(--transition), background var(--transition)',
    opacity: isUploading ? 0.7 : 1,
  }

  return (
    <div
      style={boxStyle}
      onDragOver={(event) => {
        event.preventDefault()
        if (!isUploading) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={openFilePicker}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openFilePicker()
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleBrowse}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
      {uploadError ? (
        <div style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>
          {uploadError}
        </div>
      ) : null}
      {isUploading ? (
        <div style={{ fontSize: '0.78rem' }}>Uploading...</div>
      ) : previewUrl ? (
        <div>
          <img
            src={previewUrl}
            alt={fileName}
            style={{
              width: '100%',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
            }}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--text)' }}>
            {fileName}
          </div>
          {uploadedAssetUrl ? (
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                marginTop: '0.5rem',
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '1rem',
                padding: '0.3rem 0.7rem',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              Remove Image
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem' }}>
          Drag & drop an image, or click to browse
        </div>
      )}
    </div>
  )
}

export default ImageUploader
