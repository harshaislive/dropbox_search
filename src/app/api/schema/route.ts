import { NextResponse } from 'next/server';
import { getWeaviateSchema, getWeaviateClient } from '@/lib/weaviate';

export async function GET() {
  try {
    const schema = await getWeaviateSchema();
    
    return NextResponse.json({
      schema,
      classes: schema.map(cls => ({
        name: cls.class,
        description: cls.description,
        properties: cls.properties.map(prop => ({
          name: prop.name,
          type: prop.dataType.join(', '),
          description: prop.description
        }))
      }))
    });

  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schema' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const client = getWeaviateClient();
    
    // Check if DropboxFile class exists
    const existingSchema = await client.schema.getter().do();
    const dropboxFileClass = existingSchema.classes?.find((cls: any) => cls.class === 'DropboxFile');
    
    if (dropboxFileClass) {
      return NextResponse.json({
        message: 'DropboxFile class already exists',
        class: dropboxFileClass
      });
    }
    
    // Create the DropboxFile class with CLIP vectorizer
    const classSchema = {
      class: 'DropboxFile',
      description: 'Files stored in Dropbox with AI-generated metadata',
      vectorizer: 'text2vec-clip',
      moduleConfig: {
        'text2vec-clip': {
          textFields: ['caption', 'file_name', 'tags'],
          imageFields: ['image_url']
        }
      },
      properties: [
        {
          name: 'dropbox_path',
          dataType: ['string'],
          description: 'Full path to the file in Dropbox'
        },
        {
          name: 'file_name',
          dataType: ['string'],
          description: 'Name of the file'
        },
        {
          name: 'caption',
          dataType: ['text'],
          description: 'AI-generated caption describing the file content'
        },
        {
          name: 'tags',
          dataType: ['string[]'],
          description: 'Tags associated with the file'
        },
        {
          name: 'public_url',
          dataType: ['string'],
          description: 'Public URL for the file'
        },
        {
          name: 'thumbnail_url',
          dataType: ['string'],
          description: 'Thumbnail URL for the file'
        },
        {
          name: 'file_type',
          dataType: ['string'],
          description: 'Type of file (image, video, etc.)'
        },
        {
          name: 'file_size',
          dataType: ['number'],
          description: 'Size of the file in bytes'
        },
        {
          name: 'created_at',
          dataType: ['date'],
          description: 'When the file was created'
        },
        {
          name: 'modified_at',
          dataType: ['date'],
          description: 'When the file was last modified'
        }
      ]
    };
    
    // Create the class
    await client.schema.classCreator().withClass(classSchema).do();
    
    return NextResponse.json({
      message: 'DropboxFile class created successfully with CLIP vectorizer',
      schema: classSchema
    });
    
  } catch (error) {
    console.error('Schema creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create schema', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 