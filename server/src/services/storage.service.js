import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient } from '@azure/storage-blob';

export const saveToLocalStorage = async (file) => {
  // Unique name is generated
  const uniqueName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;

  // Defines where it will be saved
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(uploadDir, uniqueName);

  // Ensures that the directory exists, if not it creates it
  await fs.mkdir(uploadDir, { recursive: true });

  // Buffer is written (the photo)
  await fs.writeFile(filePath, file.buffer);

  // Relative route is returned
  return `/uploads/${uniqueName}`;
};

export const uploadToAzureBlob = async (file) => {
  // Necesitas tu cadena de conexión en el archivo .env
  const AZURE_CONN_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const CONTAINER_NAME = 'mission-photos'; // El nombre del contenedor que hayas creado en Azure

  if (!AZURE_CONN_STRING) {
    throw new Error('Azure Storage Connection string no configurada.');
  }

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(AZURE_CONN_STRING);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  // Generamos nombre único
  const uniqueName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;

  // Obtenemos el cliente para este archivo en concreto
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueName);

  // Subimos el buffer a Azure pasándole el mimetype
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  // Devolvemos la URL pública del archivo en Azure
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

export const deleteFromAzureBlob = async (photoUrl) => {
  try {
    const AZURE_CONN_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const CONTAINER_NAME = 'mission-photos';

    if (!AZURE_CONN_STRING)
      throw new Error('Azure Storage Connection string no configurada.');

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(AZURE_CONN_STRING);
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Extraemos el nombre del archivo exacto de la URL
    // Ejemplo URL: https://<cuenta>.blob.core.windows.net/mission-photos/uuid-foto.jpg
    const urlObj = new URL(photoUrl);
    const blobName = decodeURIComponent(urlObj.pathname.split('/').pop());

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // DeleteIfExists es súper útil porque no lanza error si la foto ya no estaba en el contenedor
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error(`No se pudo borrar el blob ${photoUrl}:`, error.message);
  }
};
