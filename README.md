# Run Lindo Trading Bot Full

Install librairies
```sh
npm i
```

Build
```sh
npm run build:dev
```

And in another terminal, without closing npm run build:dev
```sh
npm start
```

# Security
100% open source, based on lindo emulator.
A fork of https://github.com/prixe/lindo

# Instructions and kamas tips
Check the data folder of this project.  

![alt text](https://raw.githubusercontent.com/developper001/lindo/master/data/1.png)  
![alt text](https://raw.githubusercontent.com/developper001/lindo/master/data/2.png)  
![alt text](https://raw.githubusercontent.com/developper001/lindo/master/data/3.png)  
![alt text](https://raw.githubusercontent.com/developper001/lindo/master/data/4.png)  
![alt text](https://raw.githubusercontent.com/developper001/lindo/master/data/5.png)  
![alt text](https://raw.githubusercontent.com/developper001/lindo/master/data/6.png)  


# Smart Plugins

3 plugins :
- Archi / ocre : find what archi is missing, bid the archi market
- Trading : find the best items to craft, fast bank resource transfert
- Rune extraction : find which item fits the best for your rune craft

## Data
Check the data folder. It contains all files used by the bot. And even more.

## Tradding
input : all prices in ventes.txt  
output : items ordered by margin  
In this version, you must update manually data/ventes.txt and data/invendu.txt by adding items at the end when sold or unsold.


# Development
## Debug tips
If you change a node file, you must restart npm run build:dev.  
If you only change a component, you just need to restart npm start.  
In MainIpcService for exemple, one must restart npm run build:dev.  
To accelerate the debug, lunch the app without closing it and then the vscode debug.  
To debug the MainProcess, choose the VSCode called 'Debug Main Process'.  
Press Ctrl + Alt + I to debug lindo.  
In the Network tab of devtools, toggle the web socket item before login.  
