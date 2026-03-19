import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { ASSET_METADATA_COLLECTION } from '../../constants/catalog'
import { SkeletonCard } from '../layout/Skeletons'

const initialEditForm = {
  fileName: '',
  internalNote: '',
}

function AdminGallery({ onRepublishToSalon, onRepublishToBeads }) {
  const [assets, setAssets] = useState([])
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [error, setError] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingAsset, setEditingAsset] = useState(null)
  const [editForm, setEditForm] = useState(initialEditForm)
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const assetsQuery = query(
      collection(db, ASSET_METADATA_COLLECTION),
      orderBy('uploadedAt', 'desc'),
    )

    const unsubscribe = onSnapshot(
      assetsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setAssets([])
          setError(null)
          setLoadingAssets(false)
          return
        }

        const nextAssets = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data()

          return {
            id: docSnapshot.id,
            ...data,
            fileName: data.fileName ?? 'Untitled asset',
            fileSize: data.fileSize ?? 'Unknown size',
            mimeType: data.mimeType ?? 'Unknown type',
            assetUrl: data.assetUrl ?? data.previewUrl ?? '',
            internalNote: data.internalNote ?? '',
          }
        })

        setAssets(nextAssets)
        setError(null)
        setLoadingAssets(false)
      },
      (err) => {
        console.error(`Failed to load ${ASSET_METADATA_COLLECTION}:`, err)
        setError('Unable to load assets right now.')
        setLoadingAssets(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const closeQuickEdit = () => {
    setEditingAsset(null)
    setEditForm(initialEditForm)
    setEditError('')
    setIsSavingEdit(false)
  }

  const handleCopy = async (assetUrl, assetId) => {
    if (!assetUrl) {
      setFeedback({
        type: 'error',
        message: 'This asset does not have a usable URL yet.',
      })
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(assetUrl)
      } else {
        window.prompt('Copy URL', assetUrl)
      }
      setCopiedId(assetId)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      window.prompt('Copy URL', assetUrl)
    }
  }

  const handleDelete = async (asset) => {
    setOpenMenuId(null)
    setFeedback(null)

    try {
      await deleteDoc(doc(db, ASSET_METADATA_COLLECTION, String(asset.id)))
      setFeedback({
        type: 'success',
        message: `${asset.fileName} was removed from the asset library.`,
      })
    } catch (deleteError) {
      console.error('Failed to delete asset metadata:', deleteError)
      setFeedback({
        type: 'error',
        message: 'Could not delete the asset metadata right now.',
      })
    }
  }

  const handleOpenQuickEdit = (asset) => {
    setOpenMenuId(null)
    setEditingAsset(asset)
    setEditForm({
      fileName: asset.fileName ?? '',
      internalNote: asset.internalNote ?? '',
    })
    setEditError('')
  }

  const handleEditChange = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSaveQuickEdit = async (event) => {
    event.preventDefault()

    if (!editingAsset) return

    if (!editForm.fileName.trim()) {
      setEditError('Enter a file name before saving.')
      return
    }

    setIsSavingEdit(true)
    setEditError('')

    try {
      await updateDoc(doc(db, ASSET_METADATA_COLLECTION, String(editingAsset.id)), {
        fileName: editForm.fileName.trim(),
        internalNote: editForm.internalNote.trim(),
      })

      closeQuickEdit()
      setFeedback({
        type: 'success',
        message: 'Asset metadata updated successfully.',
      })
    } catch (saveError) {
      console.error('Failed to update asset metadata:', saveError)
      setEditError('Could not update the asset metadata right now.')
      setIsSavingEdit(false)
    }
  }

  const handleRepublish = (asset, target) => {
    if (!asset.assetUrl) {
      setFeedback({
        type: 'error',
        message: 'This asset cannot be published until it has a valid image URL.',
      })
      return
    }

    if (target === 'salon') {
      onRepublishToSalon?.(asset)
      return
    }

    onRepublishToBeads?.(asset)
  }

  if (loadingAssets) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div className="gallery-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonCard key={`asset-skeleton-${index}`} showButton={false} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p className="admin-auth-feedback admin-auth-feedback-error">{error}</p>
      </div>
    )
  }

  if (!assets.length) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>
          No assets uploaded yet.
        </p>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '1.5rem' }}>
        {feedback ? (
          <p
            className={`admin-auth-feedback ${
              feedback.type === 'error'
                ? 'admin-auth-feedback-error'
                : 'admin-auth-feedback-success'
            }`}
            style={{ marginBottom: '1rem' }}
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="gallery-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="gallery-card">
              <div className="gallery-card-head">
                <div className="gallery-card-title">
                  <strong>{asset.fileName}</strong>
                  <span>{asset.mimeType}</span>
                </div>

                <div className="gallery-card-menu">
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === asset.id ? null : asset.id,
                      )
                    }
                  >
                    Actions
                  </button>

                  {openMenuId === asset.id ? (
                    <div className="gallery-action-menu">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset.assetUrl, asset.id)}
                      >
                        {copiedId === asset.id ? 'Copied!' : 'Copy URL'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickEdit(asset)}
                      >
                        Quick Edit
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => handleDelete(asset)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="gallery-thumb">
                {asset.assetUrl ? (
                  <img
                    className="gallery-thumb-image"
                    src={asset.assetUrl}
                    alt={asset.fileName}
                  />
                ) : (
                  <div className="gallery-thumb-empty">No asset URL found</div>
                )}
              </div>

              <div className="gallery-card-meta">
                <span>Size</span>
                <span>{asset.fileSize}</span>
                <span>Type</span>
                <span>{asset.mimeType}</span>
                <span>Note</span>
                <span>{asset.internalNote || 'No internal note yet.'}</span>
              </div>

              <div className="gallery-card-actions">
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => handleRepublish(asset, 'salon')}
                  disabled={!asset.assetUrl}
                >
                  ＋ To Braids
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => handleRepublish(asset, 'beads')}
                  disabled={!asset.assetUrl}
                >
                  ＋ To Beads
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingAsset ? (
        <div className="overlay open">
          <div className="sheet gallery-edit-sheet">
            <div className="sheet-header">
              <h2>Quick Edit Asset</h2>
              <button className="close-btn" onClick={closeQuickEdit} type="button">
                ✕
              </button>
            </div>

            <form className="form-stack" onSubmit={handleSaveQuickEdit}>
              <div className="note">
                Update internal metadata without re-uploading the image.
              </div>

              <div className="fg">
                <label>File Name</label>
                <input
                  type="text"
                  value={editForm.fileName}
                  onChange={handleEditChange('fileName')}
                  placeholder="gallery-image.jpg"
                />
              </div>

              <div className="fg">
                <label>Internal Note</label>
                <textarea
                  value={editForm.internalNote}
                  onChange={handleEditChange('internalNote')}
                  placeholder="Add ops notes, publishing context, or inventory reminders..."
                />
              </div>

              {editError ? (
                <p className="admin-auth-feedback admin-auth-feedback-error">
                  {editError}
                </p>
              ) : null}

              <div className="security-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={closeQuickEdit}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default AdminGallery
