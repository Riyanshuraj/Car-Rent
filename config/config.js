const env = process.env.NODE_ENV || 'development'

const config = {
    development: {
        port: process.env.PORT || 9990,
        dbUrl: 'mongodb://localhost:27017/',
        //dbUrl: 'mongodb+srv://admin:uzfHirM6SnIUA9El@cluster0.8cre9er.mongodb.net/',
        //dbUrl: 'mongodb+srv://user2:123454321@cluster0.t7dpb.mongodb.net/Tripps_ExamPrep1?retryWrites=true&w=majority',
        cookie: 'x-auth-token',
        secret: 'NodeJS'
    },
    production: {}
}

module.exports = config[env]