Mudumba@Mudumba MINGW64 /f/Ai Apps 1/new_vecctor_search
$ node explore-weaviate-simple.js
🔍 Exploring Weaviate Database...

📋 SCHEMA INFORMATION:
==================================================

1. Class: "DropboxFile"
   Description: A file from Dropbox with AI-generated embeddings and metadata
   Vectorizer: none
   Properties:
     - dropbox_id (text): Unique identifier from Dropbox
     - dropbox_path (text): Full path in Dropbox
     - file_name (text): Name of the file
     - file_type (text): Type of file (image/video)
     - file_extension (text): File extension
     - file_size (int): File size in bytes
     - modified_date (date): Last modified date
     - processed_date (date): Date when file was processed
     - caption (text): AI-generated caption
     - tags (text[]): Extracted tags
     - public_url (text): Public URL for the file
     - thumbnail_url (text): Thumbnail URL
     - content_hash (text): Dropbox content hash
     - metadata (object): Additional metadata


📊 SAMPLE DATA:
==================================================

🔎 Sample from "DropboxFile" class:
   No objects found


🗂️  DROPBOX PATH ANALYSIS:
==================================================

📁 Class "DropboxFile" has potential file path fields:
   - dropbox_id (text)
   - dropbox_path (text)
   - file_name (text)
   - file_type (text)
   - file_extension (text)
   - file_size (int)
   - public_url (text)
   - thumbnail_url (text)

   Sample path values:
     Object 1:
       dropbox_id: "id:IJLouBnJC4cAAAAAAAAKoQ"
       dropbox_path: "/Beforest/Collectives/Hyderabad Collective/2022 and before/06. Real time Farm Updates/From On-ground Farm Team/2022 overall/IMG_20221103_115054 (1).jpg"
       file_name: "IMG_20221103_115054 (1).jpg"
       file_type: "image"
       file_extension: ".jpg"
       file_size: "5699201"
     Object 2:
       dropbox_id: "id:IJLouBnJC4cAAAAAAAB-Rg"
       dropbox_path: "/Beforest/Collectives/Hammiyala Estate/2023 (First Look)/May visit Photos from Phone/Visit 01/20230524_140346.jpg"
       file_name: "20230524_140346.jpg"
       file_type: "image"
       file_extension: ".jpg"
       file_size: "3397448"
       public_url: "https://aipowerfulvector-production.up.railway.app/files/456e3cfebb5c137dfc0aa18d7d715a4f.jpg"     
       thumbnail_url: "https://aipowerfulvector-production.up.railway.app/files/456e3cfebb5c137dfc0aa18d7d715a4f_thumb_medium.jpg"
     Object 3:
       dropbox_id: "id:IJLouBnJC4cAAAAAAAAKqQ"
       dropbox_path: "/Beforest/Collectives/Hyderabad Collective/2022 and before/06. Real time Farm Updates/From On-ground Farm Team/2022 overall/IMG_20221103_115522 (1).jpg"
       file_name: "IMG_20221103_115522 (1).jpg"
       file_type: "image"
       file_extension: ".jpg"
       file_size: "5711893"
     Object 4:
       dropbox_id: "id:IJLouBnJC4cAAAAAAAB2GQ"
       dropbox_path: "/Beforest/Collectives/Hyderabad Collective/2023/06. Real time Farm Updates/From Team Farm Visits/Hyd May 2023/Hyd May JPG/JPEG/PBR_2445.jpg"
       file_name: "PBR_2445.jpg"
       file_type: "image"
       file_extension: ".jpg"
       file_size: "769443"
     Object 5:
       dropbox_id: "id:IJLouBnJC4cAAAAAAAB2ZA"
       dropbox_path: "/Beforest/Collectives/Hyderabad Collective/2023/06. Real time Farm Updates/From Team Farm Visits/Hyd May 2023/Hyd May JPG/JPEG/PBR_2548.jpg"
       file_name: "PBR_2548.jpg"
       file_type: "image"
       file_extension: ".jpg"
       file_size: "1068696"


🎯 VECTOR SEARCH TEST:
==================================================

🧪 Testing nearText search on "DropboxFile"
   ⚠️  nearText search returned no results


📝 GRAPHQL QUERY REFERENCE:
==================================================

🔍 To search "DropboxFile" class, use:
{
  Get {
    DropboxFile(
      nearText: { concepts: ["your search terms"] }
      limit: 20
    ) {
      _additional { id certainty }
      dropbox_id
      dropbox_path
      file_name
      file_type
      file_extension
      file_size
      modified_date
      processed_date
      caption
      tags
      public_url
      thumbnail_url
      content_hash
      metadata
    }
  }
}

✅ Exploration complete!

Mudumba@Mudumba MINGW64 /f/Ai Apps 1/new_vecctor_search
$