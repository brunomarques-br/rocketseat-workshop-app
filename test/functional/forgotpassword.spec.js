const { test, trait } = use('Test/Suite')('Forgot Password');

const Hash = use('Hash');

const Mail = use('Mail');

/** @type {typeof import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const User = use('App/Models/User');

trait('Test/ApiClient');

/** Sempre que executar uma transação dá rollback no database */
trait('DatabaseTransactions');

/**
* TDD - Send e-mail to reset a password
*/
test('it should return send an email with reset password instructions', async ({ assert, client }) => {
    Mail.fake();

    const email = 'brunomandrade.br@gmail.com';

    const user = await Factory
        .model('App/Models/User')
        .create({ email });

    await client
        .post('/forgot')
        .send({ email })
        .end();

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
    const { token } = await Factory
        .model('App/Models/Token')
        .create({ type: 'forgotpassword' });

    await client
        .post('/reset')
        .send({
            token,
            password: '123456',
            password_confirmation: '123456'
        }).end();

    const user = await User.findBy('email', email);
    const checkPassword = await Hash.verify('123456', user.password);

    assert.isTrue(checkPassword);

});