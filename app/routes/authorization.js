const { mysql } = require('../../config/config')
const { authMiddleware } = require('../middleware/middlewares')

const Router = require('express')
const router = new Router()

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const db = require('knex')(mysql)

router.get('/showUsers', showUsers)
router.post('/reg', reg)
router.post('/login', login)
router.get('/me', authMiddleware, me)
router.get('/refresh', refresh)
router.get('/logout', logout)

module.exports = router

async function generateTokens(id) {
    const payload = {
        username: 'admin',
        psw: 'admin'
    }
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {expiresIn: '15000'})
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {expiresIn: '1m'})

    const tokenData = await db('accounts').where('id', id)

    if (tokenData[0]) {
        tokenData.refreshToken = refreshToken
        db('accounts').where('id', id).update('refreshToken', refreshToken)
            .then(() => console.log('Token updated'))
    }

    return {
        accessToken,
        refreshToken
    }
}

async function reg(req, res) {
    try {
        const { username, password } = req.body || req.params

        const result = await db('accounts').where('username', username)

        if (result[0] !== undefined && !result[0].length) {
            return res.status(400).json(`${username}: Name already in use`)
        } else {
            await db('accounts').insert({
                username: username,
                psw: bcrypt.hashSync(password, 7),
            }).then(() => {return res.json(`User ${username} created`)})
        }
    } catch (e) {
        console.error(e)
    }
}

async function login(req, res) {
    try {
        const { username, password } = req.body || req.params

        const result = await db('accounts').where('username', username)
        if (!result[0]) return res.status(400).json(`${username}: User not found. Please Registr`)

        const validPassword = bcrypt.compareSync(password, result[0].psw)
        if (!validPassword) return res.status(400).json('Password Error')

        const tokens = await generateTokens(result[0].id)

        res.set({
            'Authorization' : tokens.accessToken
        })

        res.cookie('RefreshToken', tokens.refreshToken, {
            maxAge: 60000,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })

        return res.json(tokens)

    } catch (e) {
        console.error(e)
    }
}

async function refresh(req, res) {
    try {
        const cookie = req.headers.cookie.split('=')[1]

        if (!cookie) return res.status(401).json({
            message: 'Ошибка токена иди нахуй'
        })

        const tokenData = await db('accounts').where('refreshToken', cookie)

        const tokens = await generateTokens(1)

        if (tokenData[0]) {
            tokenData.refreshToken = tokens.refreshToken
            db('accounts')
                .where('refreshToken', cookie)
                .update('refreshToken', tokens.refreshToken)
                .then(() => console.log('Token updated'))
        }

        res.cookie('RefreshToken', tokens.refreshToken, {
            maxAge: 60000,
            httpOnly: true,
            sameSite: 'none',
            secure: false
        })

        return res.json(tokens)
    } catch (e) {
        console.error(e)
    }
}

async function me(req, res) {
    try {
        let scheme = {}

        const result = await db('accounts').where({username: 'admin'})

        scheme.email = 'test@gmail.com'
        scheme.id = result[0].id
        scheme.role = 'admin'
        scheme.user_icon = 'URL_icon'
        scheme.user_name = result[0].username

        return res.json(scheme)
    } catch (e) {
        console.error(e)
    }
}

async function logout(req, res) {
    try {
        const message = {}
        const cookie = req.headers.cookie.split('=')[1]

        console.log('headers -> ', req.headers)
        console.log('only cookie ', cookie)

        await db('accounts')
            .where('refreshToken', cookie)
            .update('refreshToken', 'null')
            .then(() => message.db = 'Token in db equal NULL')

        res.clearCookie(`RefreshToken=${cookie}`)

        message.refreshToken = 'Token refresh is clean '

        return res.json(message)
    } catch (e) {
        console.error(e)
    }
}

async function showUsers(req, res) {
    try {
        const result = await db('accounts').select('*')
        return res.json({result})
    } catch (e) {
        console.error(e)
    }
}