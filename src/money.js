export function formatInr(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function statusLabel(status) {
  return {
    pending: "Awaiting garage",
    confirmed: "Bay reserved",
    technician_en_route: "Tech en route",
    in_progress: "In bay",
    completed: "Closed",
    cancelled: "Cancelled",
  }[status] || status;
}
