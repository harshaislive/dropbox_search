const weaviate = require('weaviate-ts-client').default;
require('dotenv').config();

async function exploreWeaviate() {
  console.log('🔍 Exploring Weaviate Database...\n');

  // Initialize client
  if (!process.env.WEAVIATE_URL || !process.env.WEAVIATE_API_KEY) {
    console.error('❌ Missing WEAVIATE_URL or WEAVIATE_API_KEY in .env file');
    process.exit(1);
  }

  const client = weaviate.client({
    scheme: 'https',
    host: process.env.WEAVIATE_URL.replace('https://', '').replace('http://', ''),
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
  });

  try {
    // 1. Get Schema
    console.log('📋 SCHEMA INFORMATION:');
    console.log('=' .repeat(50));
    
    const schema = await client.schema.getter().do();
    
    if (!schema.classes || schema.classes.length === 0) {
      console.log('❌ No classes found in schema');
      return;
    }

    schema.classes.forEach((cls, index) => {
      console.log(`\n${index + 1}. Class: "${cls.class}"`);
      console.log(`   Description: ${cls.description || 'No description'}`);
      console.log(`   Vectorizer: ${cls.vectorizer || 'Not specified'}`);
      
      if (cls.properties && cls.properties.length > 0) {
        console.log('   Properties:');
        cls.properties.forEach(prop => {
          console.log(`     - ${prop.name} (${prop.dataType.join(', ')}): ${prop.description || 'No description'}`);
        });
      } else {
        console.log('   Properties: None defined');
      }
    });

    // 2. Sample data from each class
    console.log('\n\n📊 SAMPLE DATA:');
    console.log('=' .repeat(50));

    for (const cls of schema.classes) {
      console.log(`\n🔎 Sample from "${cls.class}" class:`);
      
      try {
        // Get a few sample objects
        const result = await client.graphql
          .get()
          .withClassName(cls.class)
          .withLimit(3)
          .withFields('_additional { id } *')
          .do();

        if (result.data && result.data.Get && result.data.Get[cls.class]) {
          const objects = result.data.Get[cls.class];
          console.log(`   Found ${objects.length} sample objects:`);
          
          objects.forEach((obj, index) => {
            console.log(`\n   Object ${index + 1}:`);
            console.log(`     ID: ${obj._additional?.id || 'No ID'}`);
            
            // Show all properties except _additional
            Object.keys(obj).forEach(key => {
              if (key !== '_additional') {
                const value = obj[key];
                if (typeof value === 'string' && value.length > 100) {
                  console.log(`     ${key}: "${value.substring(0, 100)}..."`);
                } else {
                  console.log(`     ${key}: ${JSON.stringify(value)}`);
                }
              }
            });
          });
        } else {
          console.log('   No objects found');
        }
      } catch (error) {
        console.log(`   Error fetching data: ${error.message}`);
      }
    }

    // 3. Look for dropbox-related fields
    console.log('\n\n🗂️  DROPBOX PATH ANALYSIS:');
    console.log('=' .repeat(50));

    for (const cls of schema.classes) {
      const dropboxFields = cls.properties?.filter(prop => 
        prop.name.toLowerCase().includes('dropbox') || 
        prop.name.toLowerCase().includes('path') ||
        prop.name.toLowerCase().includes('url') ||
        prop.name.toLowerCase().includes('file')
      ) || [];

      if (dropboxFields.length > 0) {
        console.log(`\n📁 Class "${cls.class}" has potential file path fields:`);
        dropboxFields.forEach(field => {
          console.log(`   - ${field.name} (${field.dataType.join(', ')})`);
        });

        // Get sample to see actual path format
        try {
          const pathFields = dropboxFields.map(f => f.name).join(' ');
          const result = await client.graphql
            .get()
            .withClassName(cls.class)
            .withLimit(5)
            .withFields(`${pathFields} _additional { id }`)
            .do();

          if (result.data?.Get?.[cls.class]) {
            console.log('\n   Sample path values:');
            result.data.Get[cls.class].forEach((obj, index) => {
              console.log(`     Object ${index + 1}:`);
              dropboxFields.forEach(field => {
                if (obj[field.name]) {
                  console.log(`       ${field.name}: "${obj[field.name]}"`);
                }
              });
            });
          }
        } catch (error) {
          console.log(`   Error fetching path samples: ${error.message}`);
        }
      }
    }

    // 4. Test vector search capability
    console.log('\n\n🎯 VECTOR SEARCH TEST:');
    console.log('=' .repeat(50));

    for (const cls of schema.classes) {
      console.log(`\n🧪 Testing nearText search on "${cls.class}"`);
      
      try {
        const result = await client.graphql
          .get()
          .withClassName(cls.class)
          .withNearText({ concepts: ['test'] })
          .withLimit(1)
          .withFields('_additional { id certainty }')
          .do();

        if (result.data?.Get?.[cls.class]?.length > 0) {
          const obj = result.data.Get[cls.class][0];
          console.log(`   ✅ nearText search works! Certainty: ${obj._additional.certainty}`);
        } else {
          console.log('   ⚠️  nearText search returned no results');
        }
      } catch (error) {
        console.log(`   ❌ nearText search failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error exploring Weaviate:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Run the exploration
exploreWeaviate().then(() => {
  console.log('\n✅ Exploration complete!');
}).catch(error => {
  console.error('💥 Fatal error:', error);
}); 