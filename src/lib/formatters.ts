export const formatInstanceName = (name: string): string => {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};