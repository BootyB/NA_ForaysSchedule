
function hashCodeSchedules(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash;
}

module.exports = { hashCodeSchedules };
