I created this script to make it easier to disable the EGS Overlay, which is needed when using Optiscaler and other things that draw overlays with EGS games.
You need to grant Administrator privileges to the bat file for it to work, since the files that must be deleted are in protected paths.

Path will be something like this:
C:\Program Files (x86)\Epic Games\Epic Online Services\managedArtifacts\98bc04bc842e4906993fd6d6644ffb8d

Files to delete will contain string "EOSOverlay".

Note that you must run this script after each update to the Epic Games Store, since it will reinstall the overlay files.