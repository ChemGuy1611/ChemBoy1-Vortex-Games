AnvilToolkit
This program is a collection of tools with the aim of making new modifications possible and making already possible modifications easier to create. 

The tool is under constant development, with new features and file support being worked on. In the future many more files will be supported and easily editable.

Unpacking and repacking .forge and .data files:
To unpack/repack a .forge or a .data file, simply select it in the game explorer and either click on the available options on the right hand side of the tool or right click the file and select the desired option. Unpacking can also be done by double clicking the .forge/.data file.

Editing textures:
To open the texture viewer, double click the texture file. Once the window has loaded, you can either save the texture as a JPG, PNG, DDS or TGA image or you can replace the texture with a new one. It is recommended to use the DDS format for replacing textures, as that gives you more control over the texture parameters.

If you need any help using the toolkit or you want to keep up to date with all the changes and improvements, you can join the AnvilToolkit discord server here: https://discord.gg/vsuGFEapdq

Changelog:
1.0.0:
Release

1.1.0:
Changes:
- Added ability to sort folders
- Added settings xml
- Added MeshShape export (AC4 only)
- Added ability to export LocalizationPackage to XML and import new XML
- Added ability to export Materials to XML and import new XML (Material XML from one game can be imported into another game)
- Added ability to export FireData to SWF and import new SWF
- Added a lot of new extension definitions and other hashes
- Added wildcard search
- Added ability to replace Unity and Syndicate texture data (console only)
- .forge and .data files are now handled by a background thread
- Reworked mesh code

Bug Fixes:
- Fixed GUI bugs
- Fixed crash when unpacking files with illegal characters in name
- Fixed Rogue texture writing
- Fixed numerous unpacker bugs
- Fixed XML value localization issues
- Fixed search glitching out when using capital letters
- Fixed various WPF assignment errors

1.1.1:
Changes:
- Reworked forge code
- Repacking forge files containing more than 5000 data files is now possible (not for Ezio Trilogy)
- Improved forge repacker speed
- Enabled GUI support for Unity and Syndicate
- TextureViewer now supports Unity and Syndicate
- Unity and Syndicate LocalizationPackage can be exported and imported
- Unity and Syndicate Materials can be exported and imported

1.2.0:
Changes:
- Added Actions label to file actions
- Added CapsuleShape export to obj
- Added DDSUnswizzle
- Added Game Editor presets
- Added Hash Converter Utility
- Added Mesh Viewer
- Added Syndicate CompiledMip support
- Added Syndicate TextureMap support
- Added Texture drag and drop replacement
- Added XML support for: DataLayer, DataLayerGroup, DataLayerManager, LineIdToSoundLengthPackage, NavalSwivelGunUpgradeSettings, ShipHealthData, DynamicActionBlockWrapper, TextureSet, TagDictionnaries, TagRules, UniverseTagRules, Universe, FastTravelManager, BuildTable, EntityBuilder, EntityGroupBuilder, LODSelector, InventoryItemSettings, UIInventoryItem and UIInventoryPage
- Added a lot of new hashes
- Added ability to save textures directly in other game formats
- Added automatic Game Explorer scaling should the default size be bigger than screen size
- Added automatic generic file backup creation
- Added glTF export and import
- Added more options to Texture Viewer
- Added multithreadding to forge unpacking
- Added option to Cut, Copy, Paste and Delete files to the Game Explorer
- Added option to automatically download AC3, AC4 and Rogue file lists for use in File References
- Added option to create backups without date, existing backups will be skipped
- Added option to drag and drop files onto the Game Explorer to move/copy them to the folder (hold CTRL while dropping to copy)
- Added option to go directly to Game Entry editor if game folder is not found
- Added support for AC2, Brotherhood and Revelations meshes
- Added support for all the DDS PixelFormats the game uses
- Added support for unpacking and repacking forge and data files for: Ghost Recon: Breakpoint, Steep, Origins and Odyssey
- Changed default mesh export type to GLB
- Changed default xml export file name
- Improved Window handling
- Improved data file compression
- Improved file format definitions
- Improved placeholder exe names
- Massive improvement to Game Explorer speed

Bug Fixes:
- Fixed AC3 files not working
- Fixed DX10 texture writing
- Fixed Rogue DataPC_extra_chr.forge writing
- Fixed Run Game button, it will now use the exe you have specified
- Fixed Syndicate Texture crashes
- Fixed Texture Viewer showing some textures darker than they really are
- Fixed crash when texconv.exe is not found
- Fixed forge writing for Ezio Trilogy
- Fixed game explorer context menu bugs
- Fixed mesh serialization
- Fixed skinned mesh reading

1.2.1:
Changes:
- Improved file lists handling
- Added Syndicate PrefetchingFileInfos support (Might cause some errors ingame for big Prefetching files)
- Added FGFL export to text utility

Bug Fixes:
- Fixed FileReference XML crash
- Fixed crash when illegal characters are found in file path
- Fixed multiple file unpacking/repacking sometimes failing to report when finished
- Fixed Game File lists being hardcoded
- Fixed AC3 BuildTable/EntityBuilder/EntityGroupBuilder support

Note:
- If you have a forge unpacked with a previous AnvilToolkit version, you have to change the GlobalMetaFile extension from .data to .MetaFile and change the PrefetchingFileInfos file extension from .data to .PrefetchInfo

1.2.2:
Changes:
- AC2-Rogue: Added XML support for: UIInventoryItem, UIInventoryPage
- AC2-Syndicate: Added XML support for InventoryItemSettings, BuildTable and EntityBuilder
- Added LocalizationPackage support to Ghost Recon Breakpoint
- Added PropertyPathNode Effect hash name
- Added TagRuleBuildTable support in the TagRules file
- Added XML support for: NavalAmmoSettingsRef
- Complete rewrite of Material code
- Given names to a lot of Material unknown parameters
- Improved BuildTable, EntityBuilder and EntityGroupBuilder code
- Improved InventoryItemSettings code
- Improved LODSelector code
- Improved file reference fetching speed a lot
- Reworked class reading
- XML Serializer now exports only game specific data, instead of data for all of the games

Bug Fixes:
- Fixed BuildTable/EntityBuilder/EntityGroupBuilder crashes
- Fixed Unity BC7 pixel format support
- Fixed crash when game icon file is not found
- Fixed forge unpacking crash when illegal path characters are found
- Fixed game explorer crash when going back from a deleted folder

1.2.3:
Changes:
- Added around 35000 new hashes
- Added support for 14 Dynamic Property classes
- Complete rewrite of Dynamic Properties code
- Data unpacker now stores temp files smaller than 1mb in RAM instead of writing them to the disk

Bug Fixes:
- Fixed numerous BuildTable/EntityBuilder bugs and crashes

1.2.4:
Changes:
- Added AC1 support
- Added AC4 ContentPackage support
- Added ShipCollisionData support for Rogue and AC4
- Added support for NavalPuckleGunSettings
- Forge and Data files will no longer unpack if their unpacked folder already exists
- Improved NavalSwivelGunUpgradeSettings

Bug Fixes:
- Fixed AC1 Class ID reading
- Fixed bug where sometime the search bar would remain focused and glitch out

1.2.5:
Changes:
- Added AssassinAbilitySet support for AC4
- Complete Scimitar Class rewrite
- AC2-Rogue:
	- Added XML support for Cloth, ClothSettings, ClothActionSettings, LiteRagdoll
- Added AC1 textures support
- Added multithreadded forge file fetching
- Added more hashes (AC4 and Rogue now have 0 numeric extensions)
- Removed all forge repacking restrictions for Ezio trilogy
- Improved ShipHealthData code
- Reworked XML reading code
- Moved compression/decompression fully to RAM
- Added RAM check
- Reworked Materials
- Added support for individual Material Properties
- Updated to latest DDSUnswizzle version
- Improved DDS deserialization, a lot more DDS formats should be recognised and NVTT exported files should work as intended
- AC4: Added XML support for EconomicSystemSettings
- Added option to batch export textures and any other file format, just select all the files, right click and export
- Added lots of enums, DynamicProperties and Services, thus further improving BuildTables support (99% of AC4 BuildTables are exportable now)
- Added option to Compile XML files
- Added option to Compile XML files when repacking a data file
- Improved overall TextureMap support
- Improved TextureMap editor speed for games that use TopMips
- Added TextureMap support for: Steep, Ghost Recon Breakpoint
- Added option to make console always on top
- Added option to prevent .bak file overwriting
- Added file tooltips
- Added BallJointCommonData XML support
- Added Mesh Viewer

Bug Fixes:
- Fixed TextureSelector and UVTransform property reading/writing
- Fixed Ezio trilogy TextureSet reading/writing
- Fixed UIInventoryItem crashes
- Fixed ShipHealthData crashes
- Fixed EntityBuilderTemplateOverride reading
- Fixed AC3 SpawnInventoryParams crash
- Fixed Unity NodeSolver crashes
- Fixed Ezio trilogy Property Path Node
- Fixed AC1 TextureMap files not exporting in formats other than DDS
- Fixed "Open in Explorer" always creating a new Windows Explorer instance
- Fixed files refusing to open in specific default Windows applications
- Fixed Syndicate SpawnInventoryParams
- Fixed Syndicate RowSelection
- Fixed Oodle crash when unpacking multiple files at once
- Fixed incorrect treatment of binormals as vertex color
- Fixed GLB export merging vertex groups with shared material

1.2.6:
Changes:
- Separated AC3 and AC3Remastered mesh saving options
- Added option to automatically rescale meshes (AC3 and later only)
- Readded Vertex Color import
- Enabled Scale editing for AC2-Revelations meshes
- Added check to prevent import without tangents for AC2-Revelations meshes
- Complete DynamicProperty rework -> Added BaseTypes
- Reworked TextureSet -> Added names to all TextureMap slots
- Added ability to set Material ID by drag and dropping Material file in the Mesh Viewer
- Added Origins and Odyssey LocalizationPackage support
- Added GRB hashes

Bug Fixes:
- Fixed crash when parsing non-mesh GLB nodes
- Fixed AC3 Classic incorrect Vertex Format assignment
- Fixed some windows staying open after swapping game
- Fixed Vertex Color reading and saving
- Fixed various GLB imported crashes, namely "Invalid Tangent" error
- Fixed AC3 Remastered Vertex formats
- Fixed AC1-Revelations Vertex formats
- Fixed Scale not being saved in AC2-Revelations meshes
- Fixed Scale being read incorrectly in AC2-Revelations meshes
- Fixed skinned mesh vertex color reading
- Fixed AC3 TimeOscillatorData
- Fixed AC3 Remastered TextureSet
- Fixed Cloth file crashes
- Fixed zero length Mesh Primitives not getting loaded
- Fixed TagRules import

1.2.7:
Changes:
- Added Time Stamps to console
- Added lots of hashes
- Added option to change Console Timestamp format
- Added read/write perms check when selecting game directory
- Made GRB data files always serialize uncompressed
- Set default culture to invariant
- Updated SharpGLTF in preparation for Skinned Meshes

- Game Explorer:
	- Added ability to open a new Mesh Viewer window or to focus the currently opened one
	- Added ability to open a new Texture Viewer window to create new Texture Maps
	- Added Backspace hotkey to go to previous folder in Game Explorer
	- Added F5 hotkey to refresh folder in Game Explorer

- Mesh Viewer:
	- Added AC1, Unity, Syndicate and GRB meshes support
	- Added Bones list
	- Added Mesh custom properties export/import
	- Added ability to merge meshes
	- Added option to load standalone GLB files -> If a mesh with the same ID is present in the Mesh Viewer, it will be replaced
	- Added options to change default and boost camera speeds in settings
	- Improved Automatic Rescale -> If an object already has a scale, it will no longer be discarded
	- Improved UI
	- Rewrote camera controller -> Camera movement is now smooth, press Shift for speed boost

- Texture Viewer:
	- Added Texture conversion tools
	- Any image format can now be used to import textures

- XML support:
	- Added GRB BuildTables support
	- Added GRB EntityBuilder support
	- Added GRB Materials support
	- Added Syndicate and Unity LiteRagdoll support
	- Added Syndicate and Unity SoftBodySettings support
	- Added Unity and Syndicate Cloth support
	- Improved MaterialNodeSolver code
	- Removed list counts from EntityBuilder, EntityGroupBuilder, BuildTable, Cloth and Material files


Bug Fixes:
- Fixed AtomRTCPDescriptor
- Fixed BaseObjectPtr
- Fixed Ezio trilogy forge file serialization
- Fixed Game Explorer crash when selected file has undefined action
- Fixed Mesh Viewer BuildTable exporting creating broken BuildTables for Ezio games
- Fixed Mesh replacement crashes
- Fixed Unity and Syndicate TextureSet
- Fixed Vertex Format conversion
- Fixed bug where Mesh Viewer would ask twice if you want to save changes when closing
- Fixed bug where extension would get removed from folders when copying
- Fixed bug where windows would not get removed from window list when closed with Alt+F4
- Fixed crash when converting texture to BC7 when importing
- Fixed crash when doubleclicking non-existing file in Game Explorer
- Fixed crashes when a mesh fails to read
- Fixed error when trying to overwrite files when copying folders
- Fixed incorrect bounds computation in meshes
- Fixed loading GLB with multiple meshes contained within
- Fixed missing constructors for some Base Types
- Fixed missing data in MeshInstancingData
- Fixed missing side buttons in Game Explorer when a Mesh file is selected
- Fixed porting TextureMaps with TopMips to older games
- Fixed windows opening and xmls exporting even when file failed to load
- Fixed crashes when importing specific GLB material types

1.2.8:
Compatibility issues:
- Data files unpacked with previous toolkit versions can NOT be repacked with 1.2.8
	- This affects only pre-Unity games
	- Can be fixed by repacking the file with 1.2.7, deleting the extracted folder and reunpacking the file with 1.2.8

- XMLs exported with previous toolkit versions can NOT be imported with 1.2.8
	- Can be fixed by importing with 1.2.7 and reexporting with 1.2.8

Changes:
- Added "Experimental" settings tab
- Added .bak file restore option
- Added AC4 NavalBoardingSettings xml support
- Added Automatic rescale when porting meshes to AC1 and Ezio games
- Added Custom theme support
- Added GRB MaterialTemplate hashes
- Added GRB support for TextureSet files
- Added ProcessingInstructions to all exported XMLs
- Added Skeleton XML export options
- Added Skeleton support
- Added Tag Names
- Added TextureFormat combobox to Texture Viewer
- Added Uncompressed texture import option
- Added VisualBitangentSign generation for ACS cloth
- Added XML compilation/import messages
- Added a lot of hashes
- Added an option to generate a "64bit File ID" to the Hash Converter
- Added button to reset settings to defaults
- Added check if data file is unpacked when repacking
- Added console error message for older unpacked data files
- Added exception handling for opening file in windows default app
- Added name of file to data file error messages
- Added notification sound when packing finishes (Enable in settings)
- Added option to add IDs to TextureMap exports
- Added option to create new folders
- Added option to disable asynchronous data file writing
- Added option to force big endian reader
- Added option to force convert 32 bit IDs to 64 bit
- Added option to remove CompiledMip dependency
- Added option to rename files and folders
- Added option to suppress Mesh Viewer import error messages
- Added reset search button
- Added search history
- Added static mesh pos W component color
- Added support for Normal, Tangent and Binormal W component colors
- Added support for multi-color GLBs
- Added support for various GRB vertex formats
- Added warning message when importing a mesh with no UVs
- Changed Ezio To Standard converter pixel format to RGBA8888
- Cleaned up windows
- Complete Data file code rewrite
- Improved DDS Header recognition
- Improved Exceptions handling
- Improved Texconv commandline arguments
- Improved folder permissions check
- Made Game Explorer not refresh the view when not necessary
- Made Unnamed files export with file ID instead
- Mesh Viewer "Export" function will now remember the previously selected extension
- Mesh Viewer "Save As" function will now remember the previously selected extension
- Moved "Open Texture Viewer" and "Open Mesh Viewer" options to the Game Explorer context menu
- Renamed some GRB Material properties
- Resolved some Material, ClusteredMeshData and Mesh hashes
- Reworked BuildTable/EntityBuilder code
- Rewrote all GRB Vertex Formats
- Settings.xml and Games.gsd will now get recreated if corrupted
- Shift + Click on a search history item deletes it
- Texture Map batch export function will now remember the previously selected extension
- Texture Viewer "Save As" function will now remember the previously selected extension
- UVs will now get populated with a default value (0,0) if they are missing
Mesh Viewer:
	- Added Mesh Deform Bones export/import
	- Added Mesh Properties to Mesh Viewer
	- Added Shadow Primitive recalculation
	- Added Skeleton details panel
	- Added Vertex Format to Mesh Import options
	- Added ability to export Meshes to a BuildTable
	- Added ability to export Scene to a BuildTable
	- Added ability to export Skeletons to a BuildTable
	- Added ability to export a glb with just skeletons
	- Added ability to export meshes with up to 5 UV sets
	- Added check for Mesh Instance exceeding bone limit
	- Added missing Vertex Color warning message
	- Added new Mesh Import options
	- Added option to Clear Meshes
	- Added option to Clear Skeletons
	- Added option to cancel mesh import
	- Added option to hide Meshes
	- Added option to hide Skeletons
	- Added option to search Mesh Bones list
	- Added option to set skeleton as main skeleton
	- Added option to show coord system
	- Added skeletons treeview to Mesh Viewer
	- Added skinned mesh import
	- Added support for Blender's other Vertex Color naming scheme
	- Added vertex weight normalization to GLB exports
	- Changed Mesh Viewer Save As to allow Scene export
	- Changed vertex color accessors to use application specific names for better Blender support
	- Improved Mesh Viewer scene hierarchy
	- Made Skeletons open in Mesh Viewer by default
	- Removed SSAO
	- Removed useless options from "Scene", "Meshes", "Skeletons"
	- Removed useless treeviewitem checkboxes in Mesh Viewer

Bug Fixes:
- Fixed "UserCategory" not getting exported to GLB
- Fixed AC1 skinned mesh quantization factor
- Fixed AC2 mesh import scale being wrong
- Fixed AC4/Rogue Cloth serialization
- Fixed ACB data decompression crash
- Fixed AnvilGLTF mesh repositioning translation scale
- Fixed Automatic Rescale issues
- Fixed BuildTable crashes
- Fixed Cloth related crashes for Ezio cloth files in newer games
- Fixed Data file error messages not showing up
- Fixed Ezio games forge crashes
- Fixed Ezio games skinned mesh scales
- Fixed GLB Material IDs import
- Fixed GLB bind matrices export
- Fixed GRB Game Selector crash
- Fixed GRB's UV serialization
- Fixed IKData not importing correctly
- Fixed Main Skeleton not getting used in GLB export
- Fixed Mesh Color0 serialization
- Fixed Mesh Morph data not getting initialized properly
- Fixed Mesh Viewer BuildTable ID generation
- Fixed Mesh Viewer GLB export crash
- Fixed Mesh Viewer render not updating when removing meshes
- Fixed Mesh properties not updating properly in Mesh Viewer
- Fixed Mesh vertex color writing
- Fixed MeshInstancingData serialization
- Fixed Meshes crashing if they contain degenerate faces
- Fixed Revelations vertex formats
- Fixed Syndicate BuildTable crashes
- Fixed Texcoord error message showing up for every mesh primitive
- Fixed Texture Viewer crashes when creating new textures
- Fixed Texture Viewer utils not working
- Fixed TextureMap batch export to PNG, JPG and TGA
- Fixed Unity and Syndicate BuildTable generation
- Fixed Unity, Syndicate and GRB MeshBone issues
- Fixed Vertex Offset on Y moving in opposite direction
- Fixed Vertex Scale not getting reset properly after saving
- Fixed XML export crashes when a string contains an invalid characters
- Fixed XML exporting even if the file is unsupported
- Fixed XML imports crashing
- Fixed XMLs, Textures and SWFs batch exporting even if the dialog is cancelled
- Fixed a bug where mesh scale would get recalculated incorrectly if replacement failed
- Fixed batch Texture Export saving them in the wrong folder
- Fixed bug where some specific files would batch import instead of export
- Fixed crash when clicking "Replace" on a new TextureMap
- Fixed crash when importing static meshes
- Fixed crash when trying to delete a file that's in use
- Fixed crashes when importing non-mesh GLB node
- Fixed data file unpacker proceeding even if an unpacked folder already exists
- Fixed duplicate vertex groups export when not using skeletons
- Fixed file list web check hang
- Fixed forge repacking data files with Unicode characters in name
- Fixed incorrect skinned mesh vertex color writing
- Fixed incorrect vertex normals/tangents/binormals writing
- Fixed incorrect vertex weights writing
- Fixed scale getting multiplied for each mesh contained within a GLB file in some cases
- Fixed settings not getting reset properly when Settings.xml is deleted
- Fixed skinned mesh position writing
- Fixed some AC3/AC3R Vertex Formats
- Fixed some AC3R mesh crashes
- Fixed some GRB Meshes crashing after resaving
- Fixed some GRB mesh formats reading vertex colors as UVs
- Fixed some Mesh crashes when index buffer contains padding indices
- Fixed some Syndicate Material crashes
- Fixed vertex format recognition sometimes failing on import
- Fixed window creation crashes
- Static mesh vertex format fixes
- Fixed Binormals calculation