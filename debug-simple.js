// Simple debugging - use this in the browser console

// Check if results are loaded
console.log('Gallery items count:', document.querySelectorAll('.gallery-item').length);

// Check first gallery item
const firstItem = document.querySelector('.gallery-item');
if (firstItem) {
  console.log('First item exists');
  
  const bottomInfo = firstItem.querySelector('.gallery-bottom-info');
  const filename = firstItem.querySelector('.gallery-filename');
  const basicInfo = firstItem.querySelector('.gallery-basic-info');
  const relevanceBadge = firstItem.querySelector('.gallery-relevance-badge');
  
  console.log('Bottom info element:', bottomInfo);
  console.log('Filename element:', filename);
  console.log('Basic info element:', basicInfo);
  console.log('Relevance badge element:', relevanceBadge);
  
  if (bottomInfo) {
    console.log('Bottom info style:', window.getComputedStyle(bottomInfo));
    console.log('Bottom info content:', bottomInfo.innerHTML);
  }
  
  if (filename) {
    console.log('Filename text:', filename.textContent);
  }
  
  if (basicInfo) {
    console.log('Basic info text:', basicInfo.textContent);
  }
  
  if (relevanceBadge) {
    console.log('Relevance badge text:', relevanceBadge.textContent);
  }
} else {
  console.log('No gallery items found');
}