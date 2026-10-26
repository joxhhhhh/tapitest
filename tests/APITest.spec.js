import { test, expect } from '@playwright/test';

let userid;

test.describe.serial('CRUD API Tests', () => {

    test('Get Request', async ({ request }) => {
        const response = await request.get('https://reqres.in/api/users?page=2');
        console.log(await response.json());
        expect(response.status()).toBe(200);
    });

    test('Post Request - create user', async ({ request }) => {
        const response = await request.post('https://reqres.in/api/users', {
            json: { name: 'Josh', job: 'Unemployed' },
            headers: { 'Accept': 'application/json' }
        });
        expect(response.status()).toBe(201);
        const res = await response.json();
        userid = res.id;
        console.log('Created User ID:', userid);
    });

    test('Put Request - update user', async ({ request }) => {
        const response = await request.put(`https://reqres.in/api/users/${userid}`, {
            json: { name: 'Josh', job: 'QA Engineer' },
            headers: { 'Accept': 'application/json' }
        });
        expect(response.status()).toBe(200);
        console.log('Updated User ID:', userid);
    });

    test('Delete Request - delete user', async ({ request }) => {
        const response = await request.delete(`https://reqres.in/api/users/${userid}`);
        expect(response.status()).toBe(204);
        console.log('Deleted User ID:', userid);
    });

});
