# 🚀 Complete Setup Guide: Enable Vector Search & Fix Issues

## 📋 **Issues Fixed**

✅ **Vector Search Not Available** - Added CLIP vectorizer schema creation  
✅ **Dropbox Thumbnails Failing** - Added fetch polyfill for Node.js  
✅ **Pagination Issues** - Implemented proper offset-based pagination  
✅ **Schema Configuration** - Added CLIP-enabled Weaviate class creation  

## 🔧 **Step 1: Create Weaviate Schema with CLIP Vectorizer**

### **Option A: Via API (Recommended)**
```bash
# Start your development server
npm run dev

# Create the schema with CLIP vectorizer
curl -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json"
```

### **Option B: Manual Weaviate Setup**
If the API approach fails, configure your Weaviate instance directly:

```json
{
  "class": "DropboxFile",
  "description": "Files stored in Dropbox with AI-generated metadata",
  "vectorizer": "text2vec-clip",
  "moduleConfig": {
    "text2vec-clip": {
      "textFields": ["caption", "file_name", "tags"],
      "imageFields": ["image_url"]
    }
  },
  "properties": [
    {
      "name": "dropbox_path",
      "dataType": ["string"],
      "description": "Full path to the file in Dropbox"
    },
    {
      "name": "file_name", 
      "dataType": ["string"],
      "description": "Name of the file"
    },
    {
      "name": "caption",
      "dataType": ["text"], 
      "description": "AI-generated caption describing the file content"
    },
    {
      "name": "tags",
      "dataType": ["string[]"],
      "description": "Tags associated with the file"
    },
    {
      "name": "public_url",
      "dataType": ["string"],
      "description": "Public URL for the file"
    },
    {
      "name": "thumbnail_url",
      "dataType": ["string"],
      "description": "Thumbnail URL for the file"
    },
    {
      "name": "file_type",
      "dataType": ["string"],
      "description": "Type of file (image, video, etc.)"
    },
    {
      "name": "file_size",
      "dataType": ["number"],
      "description": "Size of the file in bytes"
    }
  ]
}
```

## 🔑 **Step 2: Environment Variables**

Ensure your `.env` file contains:

```env
# Weaviate Configuration (REQUIRED)
WEAVIATE_URL=your-weaviate-instance.weaviate.network
WEAVIATE_API_KEY=your-api-key

# Dropbox Configuration (REQUIRED)
DROPBOX_APP_KEY=your-app-key
DROPBOX_APP_SECRET=your-app-secret
DROPBOX_REFRESH_TOKEN=your-refresh-token

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📊 **Step 3: Verify Vector Search is Working**

1. **Check Schema Creation**:
```bash
curl http://localhost:3000/api/schema
```

2. **Test Search with Debug Info**:
   - Open browser console
   - Search for "waterfall" or any term
   - Look for logs showing:
     ```
     ✅ Vector search found X results
     📊 Results: X vector + Y text = Z unique
     ```

3. **Expected Behavior**:
   - **With CLIP**: `✅ Vector search found X results`
   - **Without CLIP**: `⚠️ Vector search not available, falling back to text search`

## 🖼️ **Step 4: Fix Dropbox Thumbnails**

The fetch polyfill has been added automatically. If thumbnails still fail:

1. **Check Environment Variables**: Ensure all Dropbox credentials are correct
2. **Test Dropbox Connection**:
```bash
# Test if your Dropbox tokens work
curl -X POST https://api.dropboxapi.com/2/users/get_current_account \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

3. **Refresh Token**: Your refresh token might be expired

## 📄 **Step 5: Test Pagination**

1. **Search for a common term** (e.g., "photo", "image")
2. **Verify pagination works**:
   - First page loads 20 results
   - "Load More" button appears if hasMore = true
   - Clicking loads next 20 results
   - Results append (don't replace)

3. **Check Console Logs**:
```
📄 Page 1, hasMore: true
📄 Page 2, hasMore: false
```

## 🎯 **Step 6: Enable True Semantic Search**

For **full semantic understanding**, your Weaviate instance needs:

### **A. CLIP Module Enabled**
```yaml
# docker-compose.yml for Weaviate
services:
  weaviate:
    image: semitechnologies/weaviate:latest
    environment:
      ENABLE_MODULES: 'text2vec-clip'
      CLIP_INFERENCE_API: 'http://clip-service:8080'
```

### **B. CLIP Inference Service**
```yaml
  clip-service:
    image: semitechnologies/clip-inference:latest
    ports:
      - "8080:8080"
```

### **C. Data Population**
Once schema is created, populate with data:
```bash
# Example: Add a file with vector embedding
curl -X POST http://your-weaviate-url/v1/objects \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "DropboxFile",
    "properties": {
      "dropbox_path": "/photos/sunset.jpg",
      "file_name": "sunset.jpg", 
      "caption": "Beautiful sunset over the ocean with orange and pink clouds",
      "tags": ["sunset", "ocean", "nature", "landscape"]
    }
  }'
```

## 🧪 **Testing Your Setup**

### **Vector Search Test**
```bash
# Should find semantically similar content
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "beautiful nature scenery", "limit": 5}'
```

### **Text Search Test** 
```bash
# Should find exact text matches
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "sunset", "limit": 5}'
```

### **Pagination Test**
```bash
# Page 1
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "photo", "limit": 20, "offset": 0}'

# Page 2  
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "photo", "limit": 20, "offset": 20}'
```

## 🔍 **Troubleshooting**

### **Vector Search Still Not Working?**
1. Check Weaviate logs for CLIP module errors
2. Verify CLIP inference service is running
3. Ensure your Weaviate instance supports text2vec-clip

### **Dropbox Thumbnails Still Failing?**
1. Check if your refresh token is valid
2. Verify Dropbox app permissions include file access
3. Test with a simple Dropbox API call

### **Pagination Not Working?**
1. Check browser console for API response structure
2. Verify `hasMore` field in API response
3. Ensure offset calculation is correct

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

1. **Console Logs**:
```
🔍 Starting dual search for: "nature" (limit: 20, offset: 0)
📊 Attempting vector similarity search...
✅ Vector search found 15 results
📝 Performing text search...
✅ Text search found 8 results
🔄 Deduplicated 23 results to 18 unique items
🎯 Search completed in 245ms, returning 18 unique results
📊 Search completed using dual_search, found 18 results
📈 Results breakdown: 15 vector, 3 text, 18 total
📄 Page 1, hasMore: true
```

2. **UI Features**:
   - Search results with similarity percentages
   - Source badges (vector/text)
   - Working thumbnails
   - Proper pagination with "Load More"
   - Download links working

3. **Search Quality**:
   - Semantic queries like "people smiling" find relevant images
   - Text queries like "waterfall" find exact matches
   - Results ranked by relevance
   - No duplicate results

## 📚 **Next Steps**

Once basic functionality works:

1. **Populate More Data**: Add your actual Dropbox files to Weaviate
2. **Tune Search Parameters**: Adjust certainty thresholds
3. **Add Filters**: File type, date range, size filters
4. **Improve UI**: Add more search refinement options
5. **Performance**: Optimize for larger datasets

Your advanced vector search engine is now ready for production! 🚀 