import express from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as swaggerUi from 'swagger-ui-express';
import * as mkdirp from 'mkdirp';
import glob from 'glob';

import swaggerDocument from '../swagger.json';

let templates = glob.sync('./templates/*');
templates = templates.map(e => e.split('/').pop());

swaggerDocument.paths["/generate/{template}"]
  .post
  .parameters
  .find(e=>e.name == 'template')
  .schema
  .enum = templates;

const app: express.Application = express();
app.use(bodyParser.json());

app.use('/configs', express.static('configs'));

app.use((req: any, res, next) => {
  req.setEncoding('utf8');
  req.rawBody = '';
  req.on('data', function(chunk: any) {
    req.rawBody += chunk;
  });
  req.on('end', function(){
    next();
  });
});

app.get('/', function(req, res) {
  return res.redirect('/doc-api');
});

app.use('/doc-api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post("/generate", function(req, res) {
  const templateFile = `./templates/${req.body.template}`;
  if (!fs.existsSync(templateFile)) {
    return res.status(404).send("Error. Template not found");
  }

  let template = fs.readFileSync(templateFile).toString();
  for(let key in req.body.data) {
    let val: string = req.body.data[key];

    template = template.split(`$${key}`).join(val);
  }

  res.send(template);
});

app.post("/generate/:template", function(req: any, res) {
  mkdirp.sync('./configs');

  const templateFile = `./templates/${req.params.template}`;
  if (!fs.existsSync(templateFile)) {
    return res.status(404).send("Error. Template not found");
  }

  let lines = req.rawBody
    .split("\n")
    .map((e: string) => e.replace(/[\s]+/gi, "\t"))
    .filter((e: any) => e);

  let headers = lines.shift().split("\t");

  const filenameColumns = ['IP', 'NAME_SWITCH'];

  let nameIndex = headers
    .findIndex((e: string) => filenameColumns.includes(e));

  if (nameIndex == -1) return res.status(400).send(`Error. One of [${filenameColumns.join(',')}] not found`);

  let result = [];

  for(let line of lines) {
    let template = fs.readFileSync(templateFile).toString();

    const vals = line.split("\t");
    for(let i in headers) {
      const key = headers[i];
      const val = vals[i];
      template = template.split(`$${key}`).join(val);
    }

    let configFile = `./configs/${vals[nameIndex]}.cfg`;
    fs.writeFileSync(configFile, template);
    let basePath = req.protocol + "://" + req.headers.host;

    result.push(`${basePath}${configFile.substr(1)}`);
  }

  res.json(result);
});

app.listen(3000, function () {
  console.log("App is listening on http://localhost:3000");
});
