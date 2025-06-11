let MODS_FILTERED = mods.filter(mod => mod.type === PATCH_ID);
MODS_FILTERED.forEach(
    (mod, idx) => {
        let pos_adj = 1;
        loadOrderSuffix(context.api, mod);
        const MOD_FILES = mods[mod.id].files[mod.id];
        //const MOD_FILES = mod.files;
        MOD_FILES.forEach(
            (file, idx) => {
                const MOD_FILE = MOD_FILES[idx];
                const FILE_NAME = path.basename(MOD_FILE);
                //const FILE_NAME_NEW = FILE_NAME.replace(PATCH_STRING, PATCH_BASE_STRING + pos);
                const FILE_NAME_NEW = FILE_NAME.replace(/(?<=patch_)\d*/, pos_adj);
                fs.renameSync(MOD_FILE, path.join(path.dirname(MOD_FILE), FILE_NAME_NEW));
            }
        );
    }
);

let MODS_FILTERED = mods.filter(mod => mod.type === PATCH_ID);
MODS_FILTERED.map(
    (mod, idx) => {
        let pos_adj = 1;
        loadOrderSuffix(context.api, mod);
        const MOD_FILES = mods[mod.id].files[mod.id];
        //const MOD_FILES = mod.files;
        return MOD_FILES.map(
            (file, idx) => {
                const MOD_FILE = MOD_FILES[idx];
                const FILE_NAME = path.basename(MOD_FILE);
                //const FILE_NAME_NEW = FILE_NAME.replace(PATCH_STRING, PATCH_BASE_STRING + pos);
                const FILE_NAME_NEW = FILE_NAME.replace(/(?<=patch_)\d*/, pos_adj);
                return fs.renameSync(MOD_FILE, path.join(path.dirname(MOD_FILE), FILE_NAME_NEW));
            }
        );
    }
);


      //let MODS_FILTERED = mods.filter(mod => mod.type === PATCH_ID);
      /*
      //Do .patch0 file renaming here
      (context, loadOrder, mods) => {
                              const MODS = mods.filter(mod => mod.type === PATCH_ID);
                              MODS.forEach(
                                            (mod, index) => {
                                                              let pos_adj = 1;
                                                              loadOrderSuffix(context.api, mod);
                                                              //const MOD_FILES = mods[mod.id].files[mod.id];
                                                              const MOD_FILES = mod.files;
                                                              MOD_FILES.forEach(
                                                                                (file, index) => {
                                                                                                    const MOD_FILE = MOD_FILES[index];
                                                                                                    const FILE_NAME = path.basename(MOD_FILE);
                                                                                                    const FILE_NAME_NEW = FILE_NAME.replace(PATCH_STRING, PATCH_BASE_STRING + pos);
                                                                                                    fs.renameSync(MOD_FILE, path.join(path.dirname(MOD_FILE), FILE_NAME_NEW));
                                                                                                  }
                                                                                );
                                                              }
                                            );
                                      }  
      */