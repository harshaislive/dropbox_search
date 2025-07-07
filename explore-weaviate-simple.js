const https = require('https');
require('dotenv').config();

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          resolve(data);
        }
      });
    });
    
    request.on('error', reject);
  });
}

function makeGraphQLRequest(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    
    const options = {
      hostname: process.env.WEAVIATE_URL.replace('https://', '').replace('http://', ''),
      port: 443,
      path: '/v1/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${process.env.WEAVIATE_API_KEY}`
      }
    };
    
    const request = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}

async function exploreWeaviate() {
  console.log('🔍 Exploring Weaviate Database...\n');

  // Check environment variables
  if (!process.env.WEAVIATE_URL || !process.env.WEAVIATE_API_KEY) {
    console.error('❌ Missing WEAVIATE_URL or WEAVIATE_API_KEY in .env file');
    console.log('\nPlease create a .env file with:');
    console.log('WEAVIATE_URL=https://weaviate-wdke-production.up.railway.app');
    console.log('WEAVIATE_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    // 1. Get Schema using REST API
    console.log('📋 SCHEMA INFORMATION:');
    console.log('=' .repeat(50));
    
    const schemaUrl = `${process.env.WEAVIATE_URL}/v1/schema`;
    const headers = {
      'Authorization': `Bearer ${process.env.WEAVIATE_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const schema = await makeRequest(schemaUrl, headers);
    
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

    // 2. Sample data from each class using GraphQL
    console.log('\n\n📊 SAMPLE DATA:');
    console.log('=' .repeat(50));

    for (const cls of schema.classes) {
      console.log(`\n🔎 Sample from "${cls.class}" class:`);
      
      try {
        // Get sample objects
        const query = `{
          Get {
            ${cls.class}(limit: 3) {
              _additional { id }
              ${cls.properties?.map(p => p.name).join('\n              ') || ''}
            }
          }
        }`;
        
        const result = await makeGraphQLRequest(query);

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
          const pathFields = dropboxFields.map(f => f.name).join('\n              ');
          const query = `{
            Get {
              ${cls.class}(limit: 5) {
                _additional { id }
                ${pathFields}
              }
            }
          }`;

          const result = await makeGraphQLRequest(query);

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
        const query = `{
          Get {
            ${cls.class}(
              nearText: { concepts: ["test"] }
              limit: 1
            ) {
              _additional { id certainty }
            }
          }
        }`;

        const result = await makeGraphQLRequest(query);

        if (result.data?.Get?.[cls.class]?.length > 0) {
          const obj = result.data.Get[cls.class][0];
          console.log(`   ✅ nearText search works! Certainty: ${obj._additional.certainty}`);
        } else {
          console.log('   ⚠️  nearText search returned no results');
        }
      } catch (error) {
        console.log(`   ❌ nearText search failed: ${error.message}`);
        if (error.response) {
          console.log(`   Response: ${JSON.stringify(error.response)}`);
        }
      }
    }

    // 5. Show GraphQL query format for reference
    console.log('\n\n📝 GRAPHQL QUERY REFERENCE:');
    console.log('=' .repeat(50));
    
    schema.classes.forEach(cls => {
      console.log(`\n🔍 To search "${cls.class}" class, use:`);
      console.log(`{
  Get {
    ${cls.class}(
      nearText: { concepts: ["your search terms"] }
      limit: 20
    ) {
      _additional { id certainty }
      ${cls.properties?.map(p => p.name).join('\n      ') || ''}
    }
  }
}`);
    });

  } catch (error) {
    console.error('❌ Error exploring Weaviate:', error.message);
    console.error('❌ Full error:', error);
  }
}

// Run the exploration
exploreWeaviate().then(() => {
  console.log('\n✅ Exploration complete!');
}).catch(error => {
  console.error('💥 Fatal error:', error);
}); 