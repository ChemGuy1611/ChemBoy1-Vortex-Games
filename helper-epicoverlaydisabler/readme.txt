This script makes it easier to disable the EGS Overlay, which is needed when using Optiscaler and other things that draw overlays with EGS games.

You will be prompted to grant Administrator privileges after launching the .bat file! This is necessary as the files to delete are in protected paths.

Paths will be something like this:
C:\Program Files (x86)\Epic Games\Epic Online Services\managedArtifacts\98bc04bc842e4906993fd6d6644ffb8d
C:\Program Files (x86)\Epic Games\Launcher\Portal\Extras\Overlay

Files to delete will contain the string "EOSOverlay" or "EOSOVH".

Note that you must run this script after each update to the Epic Games Store, since it will reinstall the Overlay files (if the Overlay was updated).