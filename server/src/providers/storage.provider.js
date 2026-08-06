import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient } from '@azure/storage-blob';

export const saveToLocalStorage = async (file, folder = 'uploads/missions') => {
  // Unique name is generated
  const uniqueName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;

  // Defines where it will be saved
  const uploadDir = path.join(process.cwd(), 'public', folder);
  const filePath = path.join(uploadDir, uniqueName);

  // Ensures that the directory exists, if not it creates it
  await fs.mkdir(uploadDir, { recursive: true });

  // Buffer is written (the photo)
  await fs.writeFile(filePath, file.buffer);

  // Relative route is returned
  return `/${folder}/${uniqueName}`;
};

// Añadimos el parámetro "containerName"
export const uploadToAzureBlob = async (
  file,
  containerName = 'mission-photos',
) => {
  const AZURE_CONN_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!AZURE_CONN_STRING) {
    throw new Error('Azure Storage Connection string no configurada.');
  }

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(AZURE_CONN_STRING);

  // Usamos el contenedor dinámico
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const uniqueName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return blockBlobClient.url;
};
export const deleteFromLocalStorage = async (photoUrl) => {
  try {
    const filePath = path.join(process.cwd(), 'public', photoUrl);
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Couldn't delete local file ${photoUrl}:`, error.message);
  }
};

// Añadimos el parámetro "containerName"
export const deleteFromAzureBlob = async (
  photoUrl,
  containerName = 'mission-photos',
) => {
  try {
    const AZURE_CONN_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!AZURE_CONN_STRING)
      throw new Error('Azure Storage Connection string no configurada.');

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(AZURE_CONN_STRING);

    // Usamos el contenedor dinámico
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const urlObj = new URL(photoUrl);
    const blobName = decodeURIComponent(urlObj.pathname.split('/').pop());

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error(`No se pudo borrar el blob ${photoUrl}:`, error.message);
  }
};
