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
