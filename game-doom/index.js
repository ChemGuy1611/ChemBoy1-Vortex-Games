/*////////////////////////////////////
Name: DOOM (2016) Vortex Extension
Structure: 3rd party mod loader
Author: ChemBoy1
Version: 0.6.2
Date: 2026-08-22
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
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, resolveVersionByModVersion, testRequirementVersion } = require('./downloader');

//Specify all the information about the game
const STEAMAPP_ID = "379720";
const GOGAPP_ID = "1390579243";
const GAME_ID = "doom";
const GAME_NAME = "DOOM (2016)";
const EXEC = "DOOMx64vk.exe";
let GAME_PATH = '';
let GAME_VERSION = ''; //Game version
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

// REQUIREMENTS //////////////////////////////////////////////////////////////
const LOADER_AUTHOR = 'ZwipZwapZapony';
const LOADER_REPO = 'DOOMModLoader';
const LOADER_ARC_NAME = 'DOOMModLoader-Windows-x64.zip';
const LOADER_URL_API = `https://api.github.com/repos/${LOADER_AUTHOR}/${LOADER_REPO}`;

const LAUNCHER_AUTHOR = 'brunoanc';
const LAUNCHER_REPO = 'DOOMLauncher';
const LAUNCHER_VER = '3.0.0';
const LAUNCHER_ARC_NAME = `DOOMLauncher-v${LAUNCHER_VER}.zip`;
const LAUNCHER_URL_API = `https://api.github.com/repos/${LAUNCHER_AUTHOR}/${LAUNCHER_REPO}`;

const REQUIREMENTS = [
  { //DOOMModLoader
    archiveFileName: LOADER_ARC_NAME,
    modType: LOADER_ID,
    assemblyFileName: LOADER_FILE,
    userFacingName: LOADER_NAME,
    githubUrl: LOADER_URL_API,
    findMod: (api) => findModByFile(api, LOADER_ID, LOADER_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, LOADER_ARC_NAME),
    fileArchivePattern: new RegExp(/^DOOMModLoader-Windows-x64/, 'i'), //picks the Windows x64 asset; the file name carries no version
    resolveVersion: (api) => resolveVersionByModVersion(api, REQUIREMENTS[0]), //version only exists in the release tag, so read it back off the installed mod
  },
  { //DOOMLauncher
    archiveFileName: LAUNCHER_ARC_NAME,
    modType: LAUNCHER_ID,
    assemblyFileName: LAUNCHER_FILE,
    userFacingName: LAUNCHER_NAME,
    githubUrl: LAUNCHER_URL_API,
    findMod: (api) => findModByFile(api, LAUNCHER_ID, LAUNCHER_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, LAUNCHER_ARC_NAME),
    fileArchivePattern: new RegExp(/^DOOMLauncher-v(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[1]),
  },
];

const CONFIG_PATH = path.join(USER_HOME, 'Saved Games', 'id Software', 'DOOM', 'base');
const SAVE_PATH  = path.join(CONFIG_PATH, 'savegame');

// Filled in from data above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/677"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Doom_%282016%29";
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
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
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
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
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) { // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else { // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}

async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

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

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry !== undefined); //findMod resolves to a mod object or undefined, never a boolean
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `Failed to test requirement version: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
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
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
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
  //context.registerInstaller(`${GAME_ID}-zipmod`, 33, testZipContent, installZipContent); //zip installer removed because mods did not work in zips

  //register actions
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

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
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
    const api = context.api;
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    });
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
