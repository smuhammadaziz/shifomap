/**
 * Format date as dd/mm/yyyy HH:MM
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never"
  
  try {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return "Invalid date"
  }
}

/**
 * Format date as dd/mm/yyyy
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  
  try {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
  } catch {
    return "Invalid date"
  }
}
