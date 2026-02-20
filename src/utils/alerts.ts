import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export const alertSuccess = (title: string, text?: string) =>
  Swal.fire({ icon: 'success', title, text })

export const alertError = (title: string, text?: string) =>
  Swal.fire({ icon: 'error', title, text })

export const alertInfo = (title: string, text?: string) =>
  Swal.fire({ icon: 'info', title, text })

export const alertConfirm = (title: string, text?: string) =>
  Swal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar' })

export const toastSuccess = (title: string) =>
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title, showConfirmButton: false, timer: 2500, timerProgressBar: true })

export const toastError = (title: string) =>
  Swal.fire({ toast: true, position: 'top-end', icon: 'error', title, showConfirmButton: false, timer: 3000, timerProgressBar: true })
