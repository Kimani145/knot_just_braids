const CLIENT_DETAILS_STORAGE_KEY = 'knotJustClientDetails'

const normalizeClientDetails = (value) => ({
  firstName: typeof value?.firstName === 'string' ? value.firstName : '',
  lastName: typeof value?.lastName === 'string' ? value.lastName : '',
  email: typeof value?.email === 'string' ? value.email : '',
  phone: typeof value?.phone === 'string' ? value.phone : '',
})

export const getStoredClientDetails = () => {
  if (typeof window === 'undefined') {
    return normalizeClientDetails()
  }

  try {
    const rawValue = window.localStorage.getItem(CLIENT_DETAILS_STORAGE_KEY)

    if (!rawValue) {
      return normalizeClientDetails()
    }

    return normalizeClientDetails(JSON.parse(rawValue))
  } catch (error) {
    console.error('Failed to read stored client details:', error)
    return normalizeClientDetails()
  }
}

export const saveClientDetails = (details) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      CLIENT_DETAILS_STORAGE_KEY,
      JSON.stringify(
        normalizeClientDetails({
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          phone: details.phone,
        }),
      ),
    )
  } catch (error) {
    console.error('Failed to store client details:', error)
  }
}
