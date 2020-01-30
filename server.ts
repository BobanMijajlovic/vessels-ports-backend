import express from 'express'
const app = express()
const port: string|number = process.env.PORT || 5000
app.use('*',(req, res) => {
    res.send('<h1>Welcome to your server!</h1>') 
})

app.listen(port,() => console.log(`hosting @${port}`))