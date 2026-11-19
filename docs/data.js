/* Marvel Path Tracker | curated 2026-11-16 | runtimes are approximate */
// id | English name | Persian label | year | YYYY-MM-DD release sort | minutes | episode count (0 for films) | type | phase | sigil | palette
const ROWS = [
['iron-man','Iron Man','مرد آهنی',2008,'2008-05-02',126,0,'movie',1,'IM','amber'],
['incredible-hulk','The Incredible Hulk','هالک شگفت‌انگیز',2008,'2008-06-13',112,0,'movie',1,'H','green'],
['iron-man-2','Iron Man 2','مرد آهنی ۲',2010,'2010-05-07',124,0,'movie',1,'IM','amber'],
['thor','Thor','ثور',2011,'2011-05-06',115,0,'movie',1,'T','blue'],
['cap-first','Captain America: The First Avenger','کاپیتان آمریکا: نخستین انتقام‌جو',2011,'2011-07-22',124,0,'movie',1,'CA','red'],
['avengers','The Avengers','انتقام‌جویان',2012,'2012-05-04',143,0,'movie',1,'A','blue'],
['iron-man-3','Iron Man 3','مرد آهنی ۳',2013,'2013-05-03',130,0,'movie',2,'IM','amber'],
['thor-dark','Thor: The Dark World','ثور: دنیای تاریک',2013,'2013-11-08',112,0,'movie',2,'T','blue'],
['cap-winter','Captain America: The Winter Soldier','کاپیتان آمریکا: سرباز زمستان',2014,'2014-04-04',136,0,'movie',2,'CA','red'],
['guardians-1','Guardians of the Galaxy','نگهبانان کهکشان',2014,'2014-08-01',121,0,'movie',2,'G','purple'],
['avengers-ultron','Avengers: Age of Ultron','انتقام‌جویان: عصر اولتران',2015,'2015-05-01',141,0,'movie',2,'A','blue'],
['ant-man','Ant-Man','مرد مورچه‌ای',2015,'2015-07-17',117,0,'movie',2,'AM','red'],
['civil-war','Captain America: Civil War','کاپیتان آمریکا: جنگ داخلی',2016,'2016-05-06',147,0,'movie',3,'CA','red'],
['doctor-strange','Doctor Strange','دکتر استرنج',2016,'2016-11-04',115,0,'movie',3,'DS','purple'],
['guardians-2','Guardians of the Galaxy Vol. 2','نگهبانان کهکشان ۲',2017,'2017-05-05',136,0,'movie',3,'G','purple'],
['spider-home','Spider-Man: Homecoming','مرد عنکبوتی: بازگشت به خانه',2017,'2017-07-07',133,0,'movie',3,'SM','red'],
['thor-ragnarok','Thor: Ragnarok','ثور: رگناروک',2017,'2017-11-03',130,0,'movie',3,'T','blue'],
['black-panther','Black Panther','پلنگ سیاه',2018,'2018-02-16',134,0,'movie',3,'BP','purple'],
['infinity-war','Avengers: Infinity War','انتقام‌جویان: جنگ ابدیت',2018,'2018-04-27',149,0,'movie',3,'A','amber'],
['antman-wasp','Ant-Man and the Wasp','مرد مورچه‌ای و زنبورک',2018,'2018-07-06',118,0,'movie',3,'AM','red'],
['captain-marvel','Captain Marvel','کاپیتان مارول',2019,'2019-03-08',124,0,'movie',3,'CM','amber'],
['endgame','Avengers: Endgame','انتقام‌جویان: پایان بازی',2019,'2019-04-26',181,0,'movie',3,'A','amber'],
['spider-far','Spider-Man: Far From Home','مرد عنکبوتی: دور از خانه',2019,'2019-07-02',129,0,'movie',3,'SM','red'],
['black-widow','Black Widow','بیوه سیاه',2021,'2021-07-09',134,0,'movie',4,'BW','red'],
['shang-chi','Shang-Chi and the Legend of the Ten Rings','شانگ‌چی و افسانه ده حلقه',2021,'2021-09-03',132,0,'movie',4,'SC','amber'],
['eternals','Eternals','جاودانگان',2021,'2021-11-05',156,0,'movie',4,'E','amber'],
['spider-no','Spider-Man: No Way Home','مرد عنکبوتی: راهی به خانه نیست',2021,'2021-12-17',148,0,'movie',4,'SM','red'],
['strange-mom','Doctor Strange in the Multiverse of Madness','دکتر استرنج در چندجهانی دیوانگی',2022,'2022-05-06',126,0,'movie',4,'DS','purple'],
['thor-love','Thor: Love and Thunder','ثور: عشق و تندر',2022,'2022-07-08',119,0,'movie',4,'T','blue'],
['wakanda','Black Panther: Wakanda Forever','پلنگ سیاه: واکاندا تا ابد',2022,'2022-11-11',161,0,'movie',4,'BP','purple'],
['quantumania','Ant-Man and the Wasp: Quantumania','مرد مورچه‌ای و زنبورک: کوانتومانیا',2023,'2023-02-17',125,0,'movie',5,'AM','red'],
['guardians-3','Guardians of the Galaxy Vol. 3','نگهبانان کهکشان ۳',2023,'2023-05-05',150,0,'movie',5,'G','purple'],
['marvels','The Marvels','مارول‌ها',2023,'2023-11-10',105,0,'movie',5,'M','blue'],
['deadpool-wolverine','Deadpool & Wolverine','ددپول و ولورین',2024,'2024-07-26',128,0,'movie',5,'DW','red'],
['cap-brave','Captain America: Brave New World','کاپیتان آمریکا: دنیای شگفت‌انگیز نو',2025,'2025-02-14',118,0,'movie',5,'CA','red'],
['thunderbolts','Thunderbolts*','تاندربولتز',2025,'2025-05-02',127,0,'movie',5,'TB','gold'],
['fantastic-four','The Fantastic Four: First Steps','چهار شگفت‌انگیز: گام‌های نخست',2025,'2025-07-25',115,0,'movie',6,'F4','blue'],
['spider-brand','Spider-Man: Brand New Day','مرد عنکبوتی: روزی نو',2026,'2026-07-31',null,0,'movie',6,'SM','red'],
// Series: season records used as distinct progress units. Whole-season minutes are estimates.
['agent-carter-1','Agent Carter — Season 1','مامور کارتر — فصل ۱',2015,'2015-01-06',330,8,'series',2,'AC','gold'],
['agent-carter-2','Agent Carter — Season 2','مامور کارتر — فصل ۲',2016,'2016-01-19',420,10,'series',3,'AC','gold'],
['daredevil-1','Daredevil — Season 1','دردویل — فصل ۱',2015,'2015-04-10',676,13,'series',2,'DD','red'],
['jessica-1','Jessica Jones — Season 1','جسیکا جونز — فصل ۱',2015,'2015-11-20',650,13,'series',2,'JJ','purple'],
['daredevil-2','Daredevil — Season 2','دردویل — فصل ۲',2016,'2016-03-18',670,13,'series',3,'DD','red'],
['luke-1','Luke Cage — Season 1','لوک کیج — فصل ۱',2016,'2016-09-30',650,13,'series',3,'LC','amber'],
['iron-fist-1','Iron Fist — Season 1','آیرون فیست — فصل ۱',2017,'2017-03-17',620,13,'series',3,'IF','green'],
['defenders','The Defenders','مدافعان',2017,'2017-08-18',400,8,'series',3,'D','purple'],
['punisher-1','The Punisher — Season 1','پانیشر — فصل ۱',2017,'2017-11-17',650,13,'series',3,'P','red'],
['jessica-2','Jessica Jones — Season 2','جسیکا جونز — فصل ۲',2018,'2018-03-08',650,13,'series',3,'JJ','purple'],
['luke-2','Luke Cage — Season 2','لوک کیج — فصل ۲',2018,'2018-06-22',650,13,'series',3,'LC','amber'],
['iron-fist-2','Iron Fist — Season 2','آیرون فیست — فصل ۲',2018,'2018-09-07',500,10,'series',3,'IF','green'],
['daredevil-3','Daredevil — Season 3','دردویل — فصل ۳',2018,'2018-10-19',676,13,'series',3,'DD','red'],
['punisher-2','The Punisher — Season 2','پانیشر — فصل ۲',2019,'2019-01-18',650,13,'series',3,'P','red'],
['jessica-3','Jessica Jones — Season 3','جسیکا جونز — فصل ۳',2019,'2019-06-14',650,13,'series',3,'JJ','purple'],
['wandavision','WandaVision','وانداویژن',2021,'2021-01-15',350,9,'series',4,'WV','purple'],
['falcon','The Falcon and the Winter Soldier','فالکون و سرباز زمستان',2021,'2021-03-19',300,6,'series',4,'FW','blue'],
['loki-1','Loki — Season 1','لوکی — فصل ۱',2021,'2021-06-09',286,6,'series',4,'L','green'],
['whatif-1','What If...? — Season 1','چه می‌شد اگر؟ — فصل ۱',2021,'2021-08-11',288,9,'series',4,'WI','blue'],
['hawkeye','Hawkeye','هاکای',2021,'2021-11-24',300,6,'series',4,'HE','purple'],
['moon-knight','Moon Knight','مون نایت',2022,'2022-03-30',300,6,'series',4,'MK','amber'],
['ms-marvel','Ms. Marvel','خانم مارول',2022,'2022-06-08',270,6,'series',4,'MM','blue'],
['groot-1','I Am Groot — Season 1','من گروت هستم — فصل ۱',2022,'2022-08-10',25,5,'series',4,'G','green'],
['she-hulk','She-Hulk: Attorney at Law','شی‌هالک: وکیل دادگستری',2022,'2022-08-18',270,9,'series',4,'SH','green'],
['loki-2','Loki — Season 2','لوکی — فصل ۲',2023,'2023-10-05',300,6,'series',5,'L','green'],
['whatif-2','What If...? — Season 2','چه می‌شد اگر؟ — فصل ۲',2023,'2023-12-22',270,9,'series',5,'WI','blue'],
['secret-invasion','Secret Invasion','تهاجم مخفی',2023,'2023-06-21',270,6,'series',5,'SI','green'],
['groot-2','I Am Groot — Season 2','من گروت هستم — فصل ۲',2023,'2023-09-06',25,5,'series',5,'G','green'],
['echo','Echo','اکو',2024,'2024-01-09',250,5,'series',5,'EC','red'],
['agatha','Agatha All Along','آگاتا همه‌جا',2024,'2024-09-18',330,9,'series',5,'AG','purple'],
['whatif-3','What If...? — Season 3','چه می‌شد اگر؟ — فصل ۳',2024,'2024-12-22',240,8,'series',5,'WI','blue'],
['friendly-spider-1','Your Friendly Neighborhood Spider-Man — Season 1','مرد عنکبوتی همسایه شما — فصل ۱',2025,'2025-01-29',300,10,'series',5,'SM','red'],
['daredevil-born-1','Daredevil: Born Again — Season 1','دردویل: تولد دوباره — فصل ۱',2025,'2025-03-04',450,9,'series',5,'DD','red'],
['ironheart','Ironheart','آیرون‌هارت',2025,'2025-06-24',270,6,'series',5,'IH','amber'],
['eyes-wakanda','Eyes of Wakanda','چشمان واکاندا',2025,'2025-08-01',120,4,'series',5,'BP','purple'],
['marvel-zombies','Marvel Zombies','زامبی‌های مارول',2025,'2025-09-24',120,4,'series',5,'MZ','green'],
['wonder-man','Wonder Man','واندر من',2026,'2026-01-27',300,8,'series',6,'WM','gold'],
['daredevil-born-2','Daredevil: Born Again — Season 2','دردویل: تولد دوباره — فصل ۲',2026,'2026-03-24',400,8,'series',6,'DD','red'],
['visionquest','VisionQuest','ویژن‌کوئست',2026,'2026-10-14',360,8,'series',6,'V','gold'],
// Specials
['werewolf','Werewolf by Night','گرگینه در شب',2022,'2022-10-07',54,0,'special',4,'WW','gold'],
['guardians-holiday','Guardians of the Galaxy Holiday Special','ویژه کریسمس نگهبانان کهکشان',2022,'2022-11-25',44,0,'special',4,'G','purple'],
['punisher-special','The Punisher: One Last Kill','پانیشر: آخرین قتل',2026,'2026-05-12',55,0,'special',6,'P','red'],
// Fox universe / prior continuity, separate Doomsday route only
['xmen','X-Men','مردان ایکس',2000,'2000-07-14',104,0,'movie',0,'X','blue'],
['x2','X2: X-Men United','مردان ایکس ۲',2003,'2003-05-02',134,0,'movie',0,'X','blue'],
['deadpool','Deadpool','ددپول',2016,'2016-02-12',108,0,'movie',0,'DP','red'],
['deadpool-2','Deadpool 2','ددپول ۲',2018,'2018-05-18',119,0,'movie',0,'DP','red'],
['logan','Logan','لوگان',2017,'2017-03-03',137,0,'movie',0,'L','gold'],
['all-hail','All Hail the King','درود بر پادشاه',2014,'2014-02-04',14,0,'special',0,'K','amber']
];
const FILMS = ROWS.map(r=>({id:r[0],title:r[1],fa:r[2],year:r[3],release:r[4],minutes:r[5],episodes:r[6],type:r[7],phase:r[8],sigil:r[9],palette:r[10],universe:['xmen','x2','deadpool','deadpool-2','logan'].includes(r[0])?'fox':r[0]==='all-hail'?'bonus':'mcu'}));
const BY_ID = Object.fromEntries(FILMS.map(x=>[x.id,x]));
const DOOMSDAY = ['xmen','x2','cap-first','avengers','infinity-war','endgame','loki-1','loki-2','shang-chi','spider-home','spider-far','spider-no','wandavision','strange-mom','wakanda','falcon','deadpool','deadpool-2','logan','deadpool-wolverine','cap-brave','thunderbolts','fantastic-four'];
const BONUS = ['agatha','visionquest'];
const OFFICIAL = new Set(['xmen','x2','cap-first','avengers','infinity-war','endgame','loki-1','loki-2','shang-chi','spider-no','strange-mom','wakanda','deadpool-wolverine','cap-brave','thunderbolts','fantastic-four']);
const SEEN = [];
// A linear viewing order, grouping multiversal titles at a convenient point rather than assigning fictitious dates.
const STORY_ORDER = [
'eyes-wakanda','cap-first','agent-carter-1','agent-carter-2','captain-marvel','iron-man','iron-man-2','incredible-hulk','thor','avengers','thor-dark','iron-man-3','all-hail','cap-winter','guardians-1','guardians-2','groot-1','groot-2','daredevil-1','jessica-1','avengers-ultron','ant-man','daredevil-2','luke-1','iron-fist-1','defenders','civil-war','black-widow','black-panther','punisher-1','spider-home','doctor-strange','jessica-2','luke-2','iron-fist-2','daredevil-3','thor-ragnarok','punisher-2','jessica-3','antman-wasp','infinity-war','endgame','loki-1','loki-2','whatif-1','whatif-2','whatif-3','marvel-zombies','wandavision','shang-chi','falcon','spider-far','eternals','spider-no','strange-mom','hawkeye','moon-knight','wakanda','echo','she-hulk','ms-marvel','thor-love','ironheart','werewolf','guardians-holiday','quantumania','guardians-3','secret-invasion','marvels','deadpool-wolverine','agatha','daredevil-born-1','cap-brave','thunderbolts','fantastic-four','wonder-man','punisher-special','daredevil-born-2','spider-brand','visionquest','friendly-spider-1'
];
const STORY_INDEX = Object.fromEntries(STORY_ORDER.map((id,i)=>[id,i]));
const MCU = FILMS.filter(f=>f.universe==='mcu'||f.universe==='bonus');

/* Curated character/continuity arcs. Editorial viewing paths — not Marvel Studios official timelines. */
const STORY_ARCS = {"main":{"name":"خط اصلی انتقام‌جویان","en":"THE MAIN SAGA","icon":"✦","desc":"از شکل‌گیری تیم تا پیامد Endgame و پیوند داستان‌های چندجهانی. یک مسیر گزینش‌شده، نه تقویم رسمی.","items":["iron-man","iron-man-2","thor","cap-first","avengers","iron-man-3","cap-winter","avengers-ultron","civil-war","spider-home","black-panther","thor-ragnarok","infinity-war","endgame","loki-1","loki-2","wandavision","falcon","spider-far","spider-no","strange-mom","wakanda","shang-chi","quantumania","deadpool-wolverine","cap-brave","thunderbolts","fantastic-four","visionquest"]},"ironman":{"name":"تونی استارک و میراثش","en":"IRON MAN LEGACY","icon":"◈","desc":"داستان تونی، روابطش با انتقام‌جویان، پیتر پارکر و ادامه میراث فناوری زره.","items":["iron-man","iron-man-2","avengers","iron-man-3","avengers-ultron","civil-war","spider-home","infinity-war","endgame","ironheart"]},"captain":{"name":"از استیو تا سم و باکی","en":"CAPTAIN AMERICA","icon":"✪","desc":"مسیر سپر کاپیتان آمریکا، سرباز زمستان و تیم جدید.","items":["cap-first","avengers","cap-winter","avengers-ultron","civil-war","infinity-war","endgame","falcon","cap-brave","thunderbolts"]},"thorloki":{"name":"ثور، لوکی و آزگارد","en":"THOR & LOKI","icon":"ϟ","desc":"روابط دو برادر، سرنوشت آزگارد و نقش نسخه متفاوت لوکی در TVA.","items":["thor","avengers","thor-dark","avengers-ultron","thor-ragnarok","infinity-war","endgame","loki-1","loki-2","thor-love"]},"wanda":{"name":"واندا، ویژن و جادو","en":"THE SCARLET PATH","icon":"✧","desc":"مسیر واندا از انتقام‌جویان تا جادوی آشوب و ادامه داستان ویژن.","items":["avengers-ultron","civil-war","infinity-war","endgame","wandavision","strange-mom","agatha","visionquest"]},"spider":{"name":"مرد عنکبوتی پیتر پارکر","en":"SPIDER-MAN","icon":"✺","desc":"ورود پیتر به جهان انتقام‌جویان، پیامدهای Endgame و ادامه داستان خودش.","items":["civil-war","spider-home","infinity-war","endgame","spider-far","spider-no","spider-brand"]},"multiverse":{"name":"دکتر استرنج و مولتی‌ورس","en":"THE MULTIVERSE","icon":"⌘","desc":"از جادوهای محافظ زمین تا TVA، جهان‌های موازی و Fantastic Four.","items":["doctor-strange","thor-ragnarok","infinity-war","endgame","loki-1","loki-2","wandavision","spider-no","strange-mom","whatif-1","whatif-2","whatif-3","quantumania","deadpool-wolverine","fantastic-four"]},"wakanda":{"name":"واکاندا و پلنگ سیاه","en":"WAKANDA","icon":"◇","desc":"از معرفی واکاندا تا تغییر نسل قهرمانان و فناوری آیرون‌هارت.","items":["civil-war","black-panther","infinity-war","endgame","wakanda","ironheart","eyes-wakanda"]},"guardians":{"name":"نگهبانان کهکشان","en":"GUARDIANS OF THE GALAXY","icon":"✷","desc":"داستان خانواده کیهانیِ نگهبانان، نقششان در نبرد تانوس و پایان سه‌گانه.","items":["guardians-1","guardians-2","groot-1","groot-2","infinity-war","endgame","thor-love","guardians-holiday","guardians-3"]},"street":{"name":"دردویل و قهرمانان خیابانی","en":"STREET-LEVEL HEROES","icon":"⌁","desc":"مسیر نیویورکی Defenders تا بازگشت دردویل و مجازات‌گر.","items":["daredevil-1","jessica-1","daredevil-2","luke-1","iron-fist-1","defenders","punisher-1","daredevil-3","punisher-2","hawkeye","echo","daredevil-born-1","daredevil-born-2","punisher-special"]},"marvels":{"name":"کاپیتان مارول و قهرمانان فضایی","en":"THE MARVELS","icon":"★","desc":"کارول دنورز، کامالا خان، مونیکا رمبو و پرونده اسکرال‌ها.","items":["captain-marvel","endgame","wandavision","ms-marvel","secret-invasion","marvels"]},"antman":{"name":"انت‌من و قلمرو کوانتومی","en":"QUANTUM REALM","icon":"◎","desc":"اسکات لنگ، خانواده پیم و پیوند فناوری کوانتومی با رویدادهای Endgame.","items":["ant-man","civil-war","antman-wasp","endgame","quantumania"]},"animated":{"name":"انیمیشن‌ها و جهان‌های متفاوت","en":"ANIMATED MULTIVERSE","icon":"✳","desc":"انیمیشن‌های داستانی MCU و شاخه‌های موازی؛ بعضی آثار مستقل و غیرخطی‌اند.","items":["whatif-1","whatif-2","whatif-3","marvel-zombies","friendly-spider-1","groot-1","groot-2","eyes-wakanda"]}};
