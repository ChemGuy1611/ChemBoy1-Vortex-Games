/*////////////////////////////////////
Name: DOOM (2016) Vortex Extension
Structure: 3rd party mod loader
Author: ChemBoy1
Version: 0.5.1
Date: 2025-05-28
////////////////////////////////////*/
/*
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣠⣤⣤⣤⡴⣦⡴⣖⠶⣴⠶⡶⣖⡶⣶⢶⣲⡾⠿⢿⡷⣾⢿⣷⣦⢾⣷⣾⣶⣤⣀⣰⣤⣀⡀⠀⠀⢀⣴⣿⡿⡿⣿⣿⣦⣄⠀⠀⣠⣴⣿⡿⢿⡿⣷⣦⡄⠀⠀⢀⣀⣤⣦⣀⣤⣶⣶⣷⣦⣴⡿⢿⡷⣿⠿⡿⣿⣷⢶⣦⢴⡲⣦⢶⡶⢶⡲⣖⡶⣦⣤⣤⣤⣤⣤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣴⠶⣟⣻⣙⡏⡽⣬⢳⠴⣣⣔⡳⣤⣒⣖⡳⣰⠣⠖⠤⠶⠤⢦⣥⣭⣭⣐⣘⣘⣋⠐⠘⠛⠒⠚⠲⢮⠽⣍⣛⣻⣿⣿⣶⣿⡿⡷⣿⣽⣳⠿⣽⣿⣿⣾⣿⣯⣷⣟⡿⣟⡷⣿⣿⣶⣿⣿⣟⣫⣙⠯⡶⠞⠒⠒⠛⠃⠘⣋⣓⣀⣣⣬⣭⣬⠴⠤⠦⠵⠰⡔⣒⢦⣓⣔⣲⣒⢦⡱⢎⡵⣫⢵⣋⣏⣻⠟⣶⢦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣠⣤⣶⣿⣿⣯⣷⣾⣿⣾⣷⣿⣽⣿⣽⣿⣿⣿⣾⣽⣯⣿⣭⣿⣽⣻⣟⣻⡟⣷⢶⡶⢶⣥⣮⣍⣛⣉⢛⠛⠓⠒⠶⢦⣄⣀⠠⢈⠻⡰⣹⣽⠭⠗⠛⠑⠨⠘⠉⣿⢃⡙⠋⡘⡷⠌⠆⠑⠚⠛⠷⢭⣧⣯⢎⣻⠍⢀⣀⣀⣴⠶⠒⠚⠛⣋⣉⣛⣩⣴⣴⡶⣶⢶⣞⡿⣛⣟⣟⣯⣿⣽⣯⣷⣿⣿⣿⣿⣿⣽⣿⣿⣾⣷⣿⣷⣾⣷⣯⣿⣿⣷⣶⣤⡀⠀⠀
⢶⠿⠟⠛⠛⠛⠛⠋⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠙⠛⠛⠛⠛⠛⠿⠿⠿⢿⣿⣿⣿⣿⣿⣿⣯⣿⣞⣽⣻⡽⣿⢿⠿⣶⣶⣦⣤⡈⠙⣠⢊⢝⢎⠞⠀⠀⠀⠀⢀⢀⣁⠘⠙⠣⠜⠋⠇⣈⣀⡀⠀⠀⠀⢀⠱⡑⡀⡐⢞⢛⣉⣤⣤⣶⣶⠾⣿⢿⣏⣿⣛⣮⣷⣿⣿⣿⣿⣿⣿⣿⡿⠿⠿⠿⠛⠛⠛⠛⠛⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠛⠛⠛⠻⠿⠿⢶
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⣿⣿⣿⣿⣿⣾⣿⣟⣹⣷⣯⣿⢫⡿⣰⢃⢚⠌⡔⠂⠀⣠⣔⡟⠃⠂⠠⠀⠀⠂⠀⠀⠐⠚⢻⠢⣄⠀⠀⢂⠱⡈⡘⢆⢣⡼⣿⣽⣾⣏⣻⣽⣾⣿⣿⣿⣿⣿⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⢿⡿⣿⣿⣿⣿⣿⣿⣾⣷⢫⢊⠒⡀⣴⣞⡃⠉⠀⡴⣠⠂⡜⠀⠀⢣⠐⢄⢀⠀⠉⠉⢳⣖⢤⠀⡑⡜⣾⣧⣿⣿⣿⣿⣿⣿⢿⡿⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⠛⢱⠃⡅⣿⡟⢪⠂⢢⡞⣴⠃⡞⠁⠀⠀⠀⢳⠈⣦⠑⡄⠀⠋⡞⣧⠐⠈⡎⠙⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣷⣷⣃⢞⣼⣿⣷⣣⡴⢋⡼⠃⡼⡁⠀⠀⠀⠀⠈⣦⠈⢧⡘⢢⡐⢤⣿⣧⡒⢜⣞⣮⣿⣿⣿⣿⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣟⡿⣯⠶⢛⡥⡽⣖⡟⠺⣿⠇⢸⡃⠌⢢⠀⠀⡀⠂⢈⡇⠘⢿⡦⢿⣳⠮⠨⣿⡶⣿⢿⣻⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣯⡿⡽⣿⢄⡷⢖⠛⠃⠦⣍⠢⣀⠙⢦⡆⣸⢣⢘⣤⠞⣤⣰⢏⡵⠝⠛⡒⠾⡄⢷⢻⡿⣽⣿⢿⣏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣾⣏⢷⡱⡝⢿⣾⣿⣷⣯⣆⠈⢿⡦⠙⠤⠑⣿⢸⠛⠡⡅⢩⡾⠿⣀⣸⣷⣿⣿⣿⢛⡿⣹⢿⣾⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⣿⣿⣿⣾⡷⣿⣿⡿⣯⠉⢻⣿⡀⡄⣿⣦⣠⣄⣿⣾⣇⣤⣀⣿⢇⡄⣾⡿⠋⣹⡿⣿⣿⡿⣧⣿⣿⣝⣏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣟⢿⣼⣄⠘⢷⣤⡿⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡿⣧⣴⠛⢀⣽⣿⢿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⢮⣛⠿⣿⠛⠛⣷⣯⣟⡴⡣⠝⣿⣟⡛⣿⡗⠭⣳⣜⣿⣷⡝⢟⢻⡿⢟⣣⢾⣿⣿⣿⣻⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣿⣿⣿⣿⠻⣟⣋⢁⣷⣸⡟⣧⢿⣿⡔⠩⢼⡗⢐⡿⠌⠱⣼⣿⢷⠏⣷⣸⣆⣉⣛⡷⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠛⠛⣿⡿⣼⣯⡳⣞⡽⡇⣎⣏⣿⡱⠀⠈⢁⡆⠃⠀⣲⣼⣏⣏⡆⣿⣽⡴⣫⣧⡾⣿⡏⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⡿⣿⣿⣿⣾⣿⣑⡏⢆⣿⣿⣆⡀⢺⣿⠀⣸⣾⣿⣇⠎⣗⣳⣿⣾⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⡀⠀⢿⣿⣿⡷⣾⣿⣶⣿⣿⣿⠥⠀⣺⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣀⠘⣿⡿⣇⣿⣿⣷⣿⣿⡏⢀⢸⣿⢿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣟⢿⣿⣿⣿⣿⣿⣿⢻⡾⡦⣙⡶⡇⣿⢻⣌⡻⢞⣡⣻⣾⢹⣿⣿⣿⣿⣿⣿⢿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⣿⣜⢻⡻⣿⡿⣿⣿⣿⣿⣧⣛⣤⠿⠻⡜⠻⣧⡜⣸⣿⣿⣿⣿⠿⣿⡿⡣⢘⣿⣧⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣆⠙⣻⠃⣿⣿⣝⣆⢻⠉⡿⠚⠳⡟⠛⢺⡏⣽⢃⣏⣿⣿⡇⢿⡀⢁⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⢳⣤⠙⣿⣯⣻⢾⣇⣇⡄⠀⡃⣠⢸⣧⡿⢾⣻⣿⠟⢠⣾⠃⢻⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡏⢸⡘⣿⣶⣟⣽⠿⣾⣦⣫⡉⠉⡏⠉⣹⣡⣶⡿⢿⣜⣶⣿⠟⣸⠘⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢿⣼⣿⣿⣿⣿⢿⣿⣿⣿⣻⡟⢿⡿⢟⣟⣿⣽⢿⣿⢿⣿⣿⣿⣯⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⢿⣿⣄⠛⣿⣞⣝⠻⠿⠻⢟⠻⠟⢛⣽⣾⠟⢁⣽⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠿⣷⣮⣹⣿⣶⡶⣦⣤⡶⢶⣿⣿⣩⣾⣿⠟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');

//Specify all the information about the game
const STEAMAPP_ID = "379720";
const GOGAPP_ID = "1390579243";
const GAME_ID = "doom";
const EXEC = "DOOMx64vk.exe";
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

// Information for installers, modtypes, and tools
const USER_HOME = util.getVortexPath("home");
//const LOCALAPPDATA = util.getVortexPath("localAppData");
//const DOCUMENTS = util.getVortexPath("documents");

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries / Root Folder";

const LOADERMOD_ID = `${GAME_ID}-mods`;
const LOADERMOD_NAME = "Loader Mods";
const LOADERMOD_PATH = `Mods`;

const LOADER_ID = `${GAME_ID}-modloader`;
const LOADER_NAME = "DOOMModLoader";
const LOADER_FILE = 'doommodloader.exe';

const LAUNCHER_ID = `${GAME_ID}-launcher`;
const LAUNCHER_NAME = "DOOMLauncher";
const LAUNCHER_FILE = 'doomlauncher.exe';

const LEGACY_ID = `${GAME_ID}-legacy`;
const LEGACY_NAME = "DOOM Legacy Mod";
const LEGACY_FILE = 'dinput8.dll';

const ROLLBACK_ID = `${GAME_ID}-rollback`;
const ROLLBACK_NAME = "Version Rollback Files";
const ROLLBACK_FILE = 'doomx64vk.exe';

const COMMANDLINE_ARGS = "+devMode_enable 1 +com_skipIntroVideo 1";

const CONFIG_PATH = path.join(USER_HOME, 'Saved Games', 'id Software', 'DOOM', 'base');
const SAVE_PATH  = path.join(CONFIG_PATH, 'savegame');

// Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": "DOOM (2016)",
    "shortName": "DOOM",
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": LOADERMOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": +GOGAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": LOADERMOD_ID,
      "name": LOADERMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', LOADERMOD_PATH)
    },
    {
      "id": LEGACY_ID,
      "name": LEGACY_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": ROLLBACK_ID,
      "name": ROLLBACK_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": LOADER_ID,
      "name": LOADER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": LAUNCHER_ID,
      "name": LAUNCHER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      GOGAPP_ID,
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  /*{
    id: "DoomModLoaderLaunch",
    name: "Launch Modded DOOM",
    logo: "doom.png",
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    shell: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    //requiresLauncher: "steam",
    parameters: [COMMANDLINE_ARGS]
  }, //*/
  {
    id: "DoomLauncher",
    name: "DOOMLauncher",
    logo: "launcher.png",
    executable: () => LAUNCHER_FILE,
    requiredFiles: [
      LAUNCHER_FILE,
    ],
    detach: true,
    shell: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    parameters: []
  },
  {
    id: LOADER_ID,
    name: LOADER_NAME,
    logo: "modloader.png",
    executable: () => LOADER_FILE,
    requiredFiles: [
      LOADER_FILE,
    ],
    detach: true,
    shell: true,
    relative: true,
    exclusive: true,
    parameters: []
  },
];

//set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with correct folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam'
    });
  } //*/
  return Promise.resolve(undefined);
}

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

//Check if Mod Injector is installed
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOADER_ID);
}

//Check if Mod Injector is installed
function isLauncherInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LAUNCHER_ID);
}

//Function to auto-download Mod Loader
async function downloadDoomModLoader(api, gameSpec) {
  let modLoaderInstalled = isModLoaderInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    const NOTIF_ID = 'doom-doommodloader-installing';
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: 'Installing DOOMModLoader',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try { //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: LOADER_NAME,
      };
      const URL = `https://github.com/ZwipZwapZapony/DOOMModLoader/releases/latest/download/DOOMModLoader.zip`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, LOADER_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download/install process fails
      const errPage = `https://github.com/ZwipZwapZapony/DOOMModLoader/releases`;
      api.showErrorNotification('Failed to download/install DOOMModLoader. You must download manually.', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Mod Loader
async function downloadLauncher(api, gameSpec) {
  let modLoaderInstalled = isLauncherInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    const NOTIF_ID = 'doom-doomlauncher-installing';
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: 'Installing DOOMLauncher',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try { //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: LAUNCHER_NAME,
      };
      const URL = `https://github.com/brunoanc/DOOMLauncher/releases/download/v3.0.0/DOOMLauncher-v3.0.0.zip`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, LAUNCHER_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download/install process fails
      const errPage = `https://github.com/brunoanc/DOOMLauncher/releases`;
      api.showErrorNotification('Failed to download/install DOOMLauncher. You must download manually.', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for DOOMModLoader files
function testModLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOADER_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install DOOMModLoader files
function installModLoader(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOADER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for DOOMLauncher files
function testLauncher(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LAUNCHER_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install DOOMLauncher files
function installLauncher(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LAUNCHER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LAUNCHER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for DoomLegacyMod
function testLegacy(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LEGACY_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install DoomLegacyMod files
function installLegacy(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LEGACY_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LEGACY_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for game version rollback
function testRollback(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROLLBACK_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install game version rollback files
function installRollback(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROLLBACK_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROLLBACK_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//test for zips
async function testZipContent(files, gameId) {
  let supported = (gameId === spec.game.id);

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//Install zips
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  // If it's a double zip, we don't need to repack. 
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    return Promise.resolve({ instructions });
  }
  // Repack the ZIP
  else {
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, '.installing') + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    return Promise.resolve({ instructions });
  }
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run ATK after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = LOADER_NAME;
  const MESSAGE = `Run ${MOD_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Loader',
        action: (dismiss) => {
          runLoader(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `After installing new mods, you must run ${MOD_NAME} to install them to the game's data files.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `The process of installing the mods may take a few minutes.\n`
          }, [
            {
              label: 'Run Loader', action: () => {
                runLoader(api);
                dismiss();
              }
            },
            { label: 'Close Notification', action: () => dismiss() },
            {
              label: 'Never Show Again', action: () => {
                api.suppressNotification(NOTIF_ID);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

function runLoader(api) {
  const TOOL_ID = LOADER_ID;
  const TOOL_NAME = LOADER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { shell: true, suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await downloadDoomModLoader(api, gameSpec);
  await downloadLauncher(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: tools,
  };
  context.registerGame(game);

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(LOADER_ID, 25, testModLoader, installModLoader);
  context.registerInstaller(LAUNCHER_ID, 27, testLauncher, installLauncher);
  context.registerInstaller(LEGACY_ID, 29, testLegacy, installLegacy);
  context.registerInstaller(ROLLBACK_ID, 31, testRollback, installRollback);
  //context.registerInstaller(`${GAME_ID}-zipmod`, 33, toBlue(testZipContent), toBlue(installZipContent)); //zip installer removed because mods did not work in zips

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
