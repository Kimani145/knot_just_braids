import { useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import formatBytes from '../../utils/formatBytes'
import { compressImage } from '../../utils/imageCompressor'
import { uploadImageWithFallback } from '../../services/api'
import { auth, db } from '../../firebase'
import { ASSET_METADATA_COLLECTION } from '../../constants/catalog'

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ImageUploader({
  onUpload,
  resetSignal,
  selectedAsset = null,
  selectedAssets = [],
  allowMultiple = false,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [assets, setAssets] = useState([])

  const normalizedSelectedAssets = useMemo(() => {
    if (allowMultiple) return Array.isArray(selectedAssets) ? selectedAssets : []
    return selectedAsset ? [selectedAsset] : []
  }, [allowMultiple, selectedAsset, selectedAssets])

  useEffect(() => {
    setAssets(normalizedSelectedAssets)
  }, [normalizedSelectedAssets])

  useEffect(() => {
    if (resetSignal === undefined) return
    setAssets([])
    setUploadError('')
    setIsDragging(false)
    setIsUploading(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [resetSignal])

  const emitUpload = (nextAssets) => {
    if (allowMultiple) {
      onUpload?.(nextAssets)
      return
    }
    onUpload?.(nextAssets[0] || null)
  }

  const uploadFile = async (rawFile) => {
    // 1. Client-side canvas compression to save mobile bandwidth
    const file = await compressImage(rawFile, { maxWidth: 1600, quality: 0.85 })
    const formattedFileSize = formatBytes(file.size)

    // 2. Fetch admin token for signed upload
    const authToken = await auth.currentUser?.getIdToken?.()

    // 3. Upload to Cloudinary (signed with fallback)
    const cloudinaryResponse = await uploadImageWithFallback(file, {
      authToken,
      folder: 'knot_just/catalog',
    })

    const assetUrl = cloudinaryResponse.secure_url
    if (!assetUrl) {
      throw new Error('Cloudinary upload succeeded without returning a secure URL.')
    }

    const publicId = cloudinaryResponse.public_id || null

    await addDoc(collection(db, ASSET_METADATA_COLLECTION), {
      fileName: file.name,
      fileSize: formattedFileSize,
      mimeType: file.type,
      assetUrl,
      ...(publicId ? { publicId } : {}),
      uploadedAt: serverTimestamp(),
    })

    return {
      id: createId(),
      fileName: file.name,
      fileSize: formattedFileSize,
      mimeType: file.type,
      timestamp: new Date().toISOString(),
      previewUrl: assetUrl,
      assetUrl,
      ...(publicId ? { publicId } : {}),
    }
  }

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) =>
      file?.type?.startsWith('image/'),
    )
    if (!files.length) return

    setIsUploading(true)
    setUploadError('')

    const uploads = allowMultiple ? files : files.slice(0, 1)
    let nextAssets = allowMultiple ? [...assets] : []

    for (const file of uploads) {
      try {
        const uploadedAsset = await uploadFile(file)
        nextAssets = [...nextAssets, uploadedAsset]
      } catch (error) {
        console.error('Image upload failed:', error)
        setUploadError('Upload failed or timed out. Click to retry.')
      }
    }

    setAssets(nextAssets)
    emitUpload(nextAssets)
    setIsUploading(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleBrowse = (event) => {
    handleFiles(event.target.files)
  }

  const openFilePicker = () => {
    if (isUploading) return
    inputRef.current?.click()
  }

  const handleRemoveImage = (event, index) => {
    event.stopPropagation()
    const nextAssets = assets.filter((_, itemIndex) => itemIndex !== index)
    setAssets(nextAssets)
    emitUpload(nextAssets)
    setUploadError('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
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
        multiple={allowMultiple}
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
      ) : assets.length ? (
        <div className="image-upload-strip">
          {assets.map((asset, index) => (
            <div className="image-upload-thumb" key={asset.id || `${asset.assetUrl}-${index}`}>
              <img
                src={asset.assetUrl || asset.previewUrl}
                alt={asset.fileName || `Image ${index + 1}`}
              />
              <button
                type="button"
                className="image-upload-remove"
                onClick={(event) => handleRemoveImage(event, index)}
                aria-label={`Remove image ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem' }}>
          Drag & drop {allowMultiple ? 'images' : 'an image'}, or click to browse
        </div>
      )}
    </div>
  )
}

export default ImageUploader
