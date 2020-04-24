const { test, trait } = use('Test/Suite')('Session');

trait('Test/ApiClient');
/** Sempre que executar uma transação dá rollback no database */
trait('DatabaseTransactions');

test('it should return JWT token when session created', async ({ client }) => {
  const sessionPayload = {
    email: 'brunomarques.web@gmail.com',
    password: '123456',
  };

  const response = await client.post('/sessions').send(sessionPayload).end();
  return response.assertStatus(401);
});
