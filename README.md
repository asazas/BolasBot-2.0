# BolasBot-2.0
El bot de las bolas 2.0

## Requisitos

 - Node.js 16.6.0 o superior.

## Dependencias opcionales (bash)
 - fortunes-es

## Instrucciones de ejecución

1. Instalar dependencias -> `npm install`
2. Editar `config_example.json`: obtener ID de cliente y token de bot de la consola de desarrollador de Discord.
3. Renombrar `config_example.json` a `config.json`.
4. Ejecutar `node deploy-global-commands.js` para desplegar los comandos en Discord.
5. Ejecutar `node index.js`