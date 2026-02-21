


// utils/truncateText.js
export const truncateText = (text, maxLength = 800) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Truncate at last complete word
  const truncated = text.substr(0, maxLength);
  return truncated.substr(0, truncated.lastIndexOf(' ')) + '...';
};

// Also create a utility for reading time
// utils/truncateText.js
export const calculateReadTime = (content) => {
  if (!content) return 5;
  const wordsPerMinute = 200;
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordCount = plainText.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};