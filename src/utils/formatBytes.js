function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'

  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const k = 1024
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, unitIndex)

  return `${value.toFixed(2)} ${sizes[unitIndex]}`
}

export default formatBytes
