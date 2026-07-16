# Tether

<img width="3812" height="1938" alt="preview" src="https://github.com/user-attachments/assets/b35cb474-e228-4757-9460-591df7abfdca" />

## A new way to controll your Spotify end get a overlay without having to pay for premium.
### Controll and Freedom for Everyone
If you don't have Premium, Spotify won't give you the feature to controll spotify with any makro deck
or get an live synced overlay because you don't get access to the developer tools anymore.

With Tether you get that for **Free**. Full controll with your preffered Makro deck 
like Elgato Stream Deck or Macro Deck or even Touch Portal. And a beautifull overlay creator.

## The Instalation

If it is already released on the Spicetify Marketplace Install it on there
if not go to [the plugin](https://github.com/PixelCoreStudio/Tether-Spicetify-Extension/tree/main/tether-plugin) and download the tether.js

If you are in Windows go to `%appdata%\spicetify\Extensions\` and put the tether.js there.
If you are on Linux/MacOS go to `~/.config/spicetify/Extensions/` and put it there.

If you have done that go to the terminal/powershell and type that:
```
spicetify config extensions tether.js
spicetify apply
```

If it comes to the Marketplace and you have it Installed manually I would recommend to uninstall the manual file with:
```
spicetify config extensions tether.js-
spicetify apply
```
And look in your extensions path if its still there when it is just delete it.
Then install it with the Marketplace.

# For the extension to work properly you need to install the server

Go to the [newest Release](https://github.com/PixelCoreStudio/Tether-Spicetify-Extension/releases/tag/Theter-Server) and download the tether-server.zip
Unpack the zip and put the unpacked folder somewhere where you remember it.

After unpacking make sure you have NodeJs and npm installed check with `node -v` and `npm -v` if you dont have it installed follow the
instructions on the [NodeJS](https://nodejs.org/en) site make sure to select your operating system and npm

If you have NodeJs and npm installed successfully you can now go in your theter-server folder in the terminal
make sure that you are in the folder in the terminal
then run `npm install -y`

If that was successfull you can run `node server.js`
If you see `Server active on http://localhost:6969` go to the [link](http://localhost:6969)

If you see something like this everything is setup you can go in the editor and make you overlay or scroll down to the tutorial for makro decks to implement it
<img width="1907" height="892" alt="image" src="https://github.com/user-attachments/assets/c71268f8-3ba4-4270-a3d9-65477db06f24" />

### If you encounter any problem/fail or need help you can open a issue on github or contact me in [Discord](https://discord.gg/AqZmmXQDm3)

Also the tutorial for implementing in macro decks is AI generated if something is wrong and you know how feel free to tell me because I don't use most of the macro decks.
