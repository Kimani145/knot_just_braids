function formatCurrency(value) {
  const amount = Number(value) || 0
  return `Kshs ${amount.toLocaleString('en-KE')}`
}

export default formatCurrency
