let https = require('https')
let querystring = require('querystring')


const CLIENT_ID = "ВАШ CLIENT ID"
const CLIENT_SECRET = "ВАШ CLIENT SECRET"


let token_data

async function start() {
  try {
    //сначала очищаем все токены
    await cleartoken()

    //получаем новый токен
    token_data = await vkfetch("POST", "/api/v2/oauth2/token.json",{
      "grant_type":"client_credentials",
      "client_id":CLIENT_ID,
      "client_secret":CLIENT_SECRET
    })

    //запускаем интерактивный цикл
    while (1) {
      await cycle()
    }


  } catch(e) {
    console.log(e)
  }
}


//вывод списка подписок и спрашиваем что делать
async function cycle() {
  let subscriptions = await vkfetch("GET","/api/v3/subscription.json")
  //console.log(subscriptions);
  console.log("")
  console.log("ВАШИ ПОДПИСКИ")
  console.log("-------------")
  if (subscriptions.items.length == 0) console.log("Нет подписок\n")
  for(let i in subscriptions.items) {
    console.log(`${parseInt(i)+1} : ${subscriptions.items[i].resource} ${subscriptions.items[i].callback_url}`)
  }
  console.log("")

  console.log("   СПРАВКА")
  console.log("   -------")
  console.log("   Команда удаления: delete номер")
  console.log("   Пример: delete 2")
  
  console.log("   Команда создания: new УРЛадрес")
  console.log("   Пример: new https://callback.url.ru/my_vk_callback.php")
  console.log("   Выход: exit или Ctrl+C")
  console.log("")
  
  //Спрашиваем что делать
  let input = await readstdin()
  
  //Создание новой подписки
  if (/^new\s+(.+)/.test(input)) {
    console.log("Создание новой подписки")
    let answer = await vkfetch("POST","/api/v3/subscription.json",{
      "resource": "LEAD",
      "callback_url": RegExp.$1
    })
    console.log(answer)
  }

  //Уваление подписки
  if (/^delete\s+(.+)/.test(input)) {
    let n = parseInt(RegExp.$1)-1
    if (subscriptions.items[n]) {
      console.log("Удаление подписки")
      let answer = await vkfetch("DELETE",`/api/v3/subscription/${subscriptions.items[n].id}.json`)
      console.log(answer)
    } else {
      console.log("Номер не найден")
    }
  }

  //выход
  if (/^exit/.test(input)) {
    await cleartoken()
    process.exit(1);
  }


}

function vkfetch(method, path, data) {
  //console.log(method, path, data)
  return new Promise ((resolve,reject) => {
    let post_data = token_data ? Buffer.from(JSON.stringify(data || ""),"utf8") : querystring.stringify(data)

    let headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(post_data)
    }
    if (token_data) headers.Authorization = "Bearer "+token_data.access_token

    let post_options = {
      host: 'ads.vk.com',
      port: '443',
      path: path,
      method: method,
      headers: headers
    };
    //console.log(post_options)

    // Set up the request
    let post_req = https.request(post_options, function(res) {
      let response = ""
      res.setEncoding('utf8')
      res.on('data', function (chunk) {
        response += chunk
        
      })
      res.on('end', function () {
        //console.log("RESPONSE = "+response)
        resolve(response ? JSON.parse(response) : null)
      });
    })

    post_req.write(post_data)
    post_req.end()
  })
}

function readstdin() {
  return new Promise((resolve,reject)=>{
    process.stdout.write("> ")
    let stdin = process.openStdin()
    stdin.addListener("data", function(d) {
      resolve(d.toString('utf8').replace("\n",""))
    })
  })
}
async function cleartoken(){
  await vkfetch("POST", "/api/v2/oauth2/token/delete.json",{
    "client_id":CLIENT_ID,
    "client_secret":CLIENT_SECRET
  })
  console.log("токены очищены")
}

//Обязательно очищаем все токены доступа, так как в ВК лимит 5 токенов на аккаунт
for (sig of ['exit', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM']) {
  process.on(sig, async function () {
    await cleartoken()
    process.exit(1);
  });
}

start()
