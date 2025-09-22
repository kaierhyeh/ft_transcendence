// TODO - to remove if not used
// This would stay - it's business logic, not format validation
export function isUsernameAvailable(username: string, existingUsers: string[]): boolean {
  return !existingUsers.includes(username.toLowerCase());
}

// TODO - to remove if not used
// Complex validation that JSON Schema can't handle
// export function isValidProfileImageUrl(url: string): boolean {
//   return url.includes('imgur.com') || url.includes('cloudinary.com');
// }