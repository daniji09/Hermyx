import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages } from '@hermyx/shared';

const test_mission = vi.hoisted(() => {
  return {
    title: 'Test mission',
    description: 'This is a test mission.',
    vacancies: 5,
    reward: 100,
    difficulty: 3,
    isDraft: false,
  };
});

const test_user = vi.hoisted(() => {
  return {
    email: 'email@email.com',
    username: 'testUsername',
    password: 'testPassword123_',
    firebaseUid: 'test-firebase-uid-123',
  };
});

let owner_id;

vi.mock('../src/middlewares/auth.middleware.js', () => {
  return {
    verifyToken: (req, res, next) => {
      req.user = { uid: owner_id };
      next();
    },
  };
});

// Before each test, test db data is cleansed
beforeEach(async () => {
  await pool.query('TRUNCATE TABLE mission CASCADE');
  await pool.query('TRUNCATE TABLE app_user CASCADE');

  const insertResult = await pool.query(
    'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
    [test_user.email, test_user.username, test_user.firebaseUid],
  );

  owner_id = insertResult.rows[0].uid;
});

// After all tests pool is ended
afterAll(async () => {
  await pool.end();
});

describe('POST /api/missions', () => {
  it('should', async () => {
    const response = await request(app)
      .post('/api/missions')
      .send(test_mission);

    console.log(response.body);

    expect(response.status).toBe(201);
    expect(response.header['content-type']).toEqual(
      expect.stringContaining('json'),
    );

    expect(response.body.data.title).toBe(test_mission.title);
    expect(response.body.data.description).toBe(test_mission.description);
    expect(response.body.data.owner_id).toBe(owner_id);
  });

  it('debería permitir guardar un borrador aunque le falte el título', async () => {
    // Modificamos la plantilla "al vuelo" para este caso
    const draftMission = {
      ...test_mission,
      title: '', // Título vacío
      isDraft: true, // Marcamos como borrador
    };
    
    const response = await request(app)
      .post('/api/missions')
      .send(draftMission);

    console.log(response.body);

    // Como es borrador, tu validador debería dejarlo pasar y crear la misión
    expect(response.status).toBe(201);

    // Comprobamos que efectivamente se ha guardado
    expect(response.body.data).toBeDefined();
    // (Opcional) Si tu API devuelve el is_draft, podemos comprobarlo:
    // expect(response.body.data.is_draft).toBe(true);
  });
});

/*
// --- CASOS DE ERROR (CORNER CASES) ---
  it('should return a 400 status if required fields are missing', async () => {
    // Creamos un objeto sin el título (suponiendo que es obligatorio)
    const invalidMission = {
      description: 'Missing title mission',
      vacancies: 2,
    };

    const response = await request(app)
      .post('/api/missions')
      .send(invalidMission);

    // Comprobamos que la API rechaza la petición
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.body.errors).toBeDefined();
    // Ajusta esta línea dependiendo de cómo devuelva los errores tu validador
    // expect(response.body.errors.title[0]).toBe(messages.FIELD_REQUIRED('Title')); 
  });

  it('should return a 400 status if numeric values are invalid (e.g., negative vacancies)', async () => {
    // Enviamos una misión con datos numéricos incorrectos
    const invalidMission = {
      ...test_mission,
      vacancies: -5, // No puede haber vacantes negativas
    };

    const response = await request(app)
      .post('/api/missions')
      .send(invalidMission);

    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.body.errors).toBeDefined();
  });
});
*/
