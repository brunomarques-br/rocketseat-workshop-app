const { test, trait } = use('Test/Suite')('Forgot Password');
const Hash = use('Hash');
const Mail = use('Mail');
const Database = use('Database');

const { subHours, format } = require('date-fns');

/** @type {typeof import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');

trait('Test/ApiClient');

/** Sempre que executar uma transação dá rollback no database */
trait('DatabaseTransactions');

/**
 * TDD - Send e-mail to reset a password
 */
test('it should return send an email with reset password instructions', async ({
  assert,
  client,
}) => {
  Mail.fake();

  const email = 'brunomandrade.br@gmail.com';

  const user = await Factory.model('App/Models/User').create({ email });

  await client.post('/forgot').send({ email }).end();

  const token = await user.tokens().first();

  const recentEmail = Mail.pullRecent();

  assert.equal(recentEmail.message.to[0].address, email);

  /**
   * Verificação se o token possui:
   * user_id seja igual ao user.id
   * e o type esteja definido como 'forgotpassword'
   */
  assert.include(token.toJSON(), {
    type: 'forgotpassword',
  });

  Mail.restore();
});

/**
 * TDD - Reset Password
 *
 * Chamar uma rota '/reset', passando como parâmetros:
 *  - token,
 *  - senha nova,
 *  - confirmacao da senha
 *  - senha precisa mudar
 *
 * RN: So vai poder reiniciar a senha se o token tiver sido criado a menos de 2h.
 *
 */

test('it should be able to reset password', async ({ assert, client }) => {
  const email = 'brunomandrade.br@gmail.com';

  const user = await Factory.model('App/Models/User').create({ email });
  const userToken = await Factory.model('App/Models/Token').make();

  await user.tokens().save(userToken);

  const response = await client
    .post('/reset')
    .send({
      token: userToken.token,
      password: '123456',
      password_confirmation: '123456',
    })
    .end();

  response.assertStatus(204);

  await user.reload();
  const checkPassword = await Hash.verify('123456', user.password);

  assert.isTrue(checkPassword);
});

/**
 * TDD - Cannot perrmited change user password after 2h
 *
 * RN: So vai poder reiniciar a senha se o token tiver sido criado a menos de 2h.
 *
 */
test('it cannot reset password after 2h of forgot password request', async ({
  client,
}) => {
  const email = 'brunomandrade.br@gmail.com';

  const user = await Factory.model('App/Models/User').create({ email });
  const userToken = await Factory.model('App/Models/Token').make();

  await user.tokens().save(userToken);

  const dateWithSub = format(subHours(new Date(), 3), 'yyyy-MM-dd HH:ii:ss');

  await Database.table('tokens')
    .where('token', userToken.token)
    .update('created_at', dateWithSub);

  await userToken.reload();

  const response = await client
    .post('/reset')
    .send({
      token: userToken.token,
      password: '123456',
      password_confirmation: '123456',
    })
    .end();

  response.assertStatus(400);
});
