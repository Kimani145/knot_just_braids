import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'

function AdminGallery() {
  const [assets, setAssets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const assetsQuery = query(
      collection(db, 'assets_metadata'),
      orderBy('uploadedAt', 'desc'),
    )

    const unsubscribe = onSnapshot(
      assetsQuery,
      (snapshot) => {
        const nextAssets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAssets(nextAssets)
        setIsLoading(false)
      },
      (err) => {
        console.error('Failed to load assets_metadata:', err)
        setError('Unable to load assets right now.')
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const handleCopy = async (assetUrl, assetId) => {
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

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>Loading assets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>{error}</p>
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
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {assets.map((asset) => (
          <div
            key={asset.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.8rem',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                overflow: 'hidden',
                borderRadius: '0.75rem',
                background: 'var(--surface2)',
                marginBottom: '0.75rem',
              }}
            >
              <img
                src={asset.assetUrl}
                alt={asset.fileName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '0.35rem 0.6rem',
                fontSize: '0.72rem',
                color: 'var(--muted)',
                marginBottom: '0.8rem',
              }}
            >
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                File
              </span>
              <span style={{ color: 'var(--text)' }}>{asset.fileName}</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Size
              </span>
              <span style={{ color: 'var(--text)' }}>{asset.fileSize}</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Type
              </span>
              <span style={{ color: 'var(--text)' }}>{asset.mimeType}</span>
            </div>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => handleCopy(asset.assetUrl, asset.id)}
            >
              {copiedId === asset.id ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminGallery
