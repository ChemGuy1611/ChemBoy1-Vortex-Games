# Changelog

## Future Improvements (Not Yet Released)

- Add full Xbox version support (not on Game Pass) - discovery (need appxmanifest.xml), binaries folders

## [0.3.0] - 2026-02-02

- Added: Basic Xbox version support (discovery and executable setting). Note that only pak mods will install properly for Xbox at this time (not binaries or UE4SS mods)
- Added: Game discovery for GOG version
- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to download UE4SS and open several files/folders/URLs
