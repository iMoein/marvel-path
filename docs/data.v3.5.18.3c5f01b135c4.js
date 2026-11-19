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
['agent-carter-1','Agent Carter — Season 1','مامور کارتر — فصل ۱',2015,'2015-01-06',330,8,'series',0,'AC','gold'],
['agent-carter-2','Agent Carter — Season 2','مامور کارتر — فصل ۲',2016,'2016-01-19',420,10,'series',0,'AC','gold'],
['daredevil-1','Daredevil — Season 1','دردویل — فصل ۱',2015,'2015-04-10',676,13,'series',0,'DD','red'],
['jessica-1','Jessica Jones — Season 1','جسیکا جونز — فصل ۱',2015,'2015-11-20',650,13,'series',0,'JJ','purple'],
['daredevil-2','Daredevil — Season 2','دردویل — فصل ۲',2016,'2016-03-18',670,13,'series',0,'DD','red'],
['luke-1','Luke Cage — Season 1','لوک کیج — فصل ۱',2016,'2016-09-30',650,13,'series',0,'LC','amber'],
['iron-fist-1','Iron Fist — Season 1','آیرون فیست — فصل ۱',2017,'2017-03-17',620,13,'series',0,'IF','green'],
['defenders','The Defenders','مدافعان',2017,'2017-08-18',400,8,'series',0,'D','purple'],
['punisher-1','The Punisher — Season 1','پانیشر — فصل ۱',2017,'2017-11-17',650,13,'series',0,'P','red'],
['jessica-2','Jessica Jones — Season 2','جسیکا جونز — فصل ۲',2018,'2018-03-08',650,13,'series',0,'JJ','purple'],
['luke-2','Luke Cage — Season 2','لوک کیج — فصل ۲',2018,'2018-06-22',650,13,'series',0,'LC','amber'],
['iron-fist-2','Iron Fist — Season 2','آیرون فیست — فصل ۲',2018,'2018-09-07',500,10,'series',0,'IF','green'],
['daredevil-3','Daredevil — Season 3','دردویل — فصل ۳',2018,'2018-10-19',676,13,'series',0,'DD','red'],
['punisher-2','The Punisher — Season 2','پانیشر — فصل ۲',2019,'2019-01-18',650,13,'series',0,'P','red'],
['jessica-3','Jessica Jones — Season 3','جسیکا جونز — فصل ۳',2019,'2019-06-14',650,13,'series',0,'JJ','purple'],
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
['eyes-wakanda','Eyes of Wakanda','چشمان واکاندا',2025,'2025-08-01',120,4,'series',6,'BP','purple'],
['marvel-zombies','Marvel Zombies','زامبی‌های مارول',2025,'2025-09-24',120,4,'series',6,'MZ','green'],
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
['all-hail','All Hail the King','درود بر پادشاه',2014,'2014-02-04',14,0,'special',2,'K','amber']
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

/* Official title/studio destinations sourced from public studio links and catalogues. */
const OFFICIAL_TITLE_LINKS = {
  "iron-man-3": {
    "url": "https://movies.disney.com/marvels-iron-man-3",
    "label": "Disney Movies"
  },
  "cap-winter": {
    "url": "https://movies.disney.com/captain-america-the-winter-soldier",
    "label": "Disney Movies"
  },
  "guardians-1": {
    "url": "https://movies.disney.com/marvels-guardians-of-the-galaxy",
    "label": "Disney Movies"
  },
  "avengers-ultron": {
    "url": "https://movies.disney.com/marvels-avengers-age-of-ultron",
    "label": "Disney Movies"
  },
  "ant-man": {
    "url": "https://movies.disney.com/ant-man",
    "label": "Disney Movies"
  },
  "civil-war": {
    "url": "https://movies.disney.com/captain-america-civil-war",
    "label": "Disney Movies"
  },
  "doctor-strange": {
    "url": "https://movies.disney.com/doctor-strange",
    "label": "Disney Movies"
  },
  "guardians-2": {
    "url": "https://movies.disney.com/guardians-of-the-galaxy-vol-2",
    "label": "Disney Movies"
  },
  "thor-ragnarok": {
    "url": "https://movies.disney.com/thor-ragnarok",
    "label": "Disney Movies"
  },
  "black-panther": {
    "url": "https://movies.disney.com/black-panther",
    "label": "Disney Movies"
  },
  "antman-wasp": {
    "url": "https://movies.disney.com/ant-man-and-the-wasp",
    "label": "Disney Movies"
  },
  "infinity-war": {
    "url": "https://movies.disney.com/avengers-infinity-war",
    "label": "Disney Movies"
  },
  "captain-marvel": {
    "url": "https://movies.disney.com/captain-marvel",
    "label": "Disney Movies"
  },
  "endgame": {
    "url": "https://movies.disney.com/avengers-endgame",
    "label": "Disney Movies"
  },
  "black-widow": {
    "url": "https://movies.disney.com/black-widow",
    "label": "Disney Movies"
  },
  "shang-chi": {
    "url": "https://movies.disney.com/shang-chi-and-the-legend-of-the-ten-rings",
    "label": "Disney Movies"
  },
  "eternals": {
    "url": "https://movies.disney.com/eternals",
    "label": "Disney Movies"
  },
  "strange-mom": {
    "url": "https://movies.disney.com/doctor-strange-in-the-multiverse-of-madness",
    "label": "Disney Movies"
  },
  "thor-love": {
    "url": "https://movies.disney.com/thor-love-and-thunder",
    "label": "Disney Movies"
  },
  "wakanda": {
    "url": "https://movies.disney.com/black-panther-wakanda-forever",
    "label": "Disney Movies"
  },
  "quantumania": {
    "url": "https://movies.disney.com/ant-man-and-the-wasp-quantumania",
    "label": "Disney Movies"
  },
  "guardians-3": {
    "url": "https://movies.disney.com/guardians-of-the-galaxy-vol-3",
    "label": "Disney Movies"
  },
  "marvels": {
    "url": "https://movies.disney.com/the-marvels",
    "label": "Disney Movies"
  },
  "cap-brave": {
    "url": "https://movies.disney.com/captain-america-brave-new-world",
    "label": "Disney Movies"
  },
  "thunderbolts": {
    "url": "https://movies.disney.com/thunderbolts",
    "label": "Disney Movies"
  },
  "fantastic-four": {
    "url": "https://movies.disney.com/the-fantastic-four-first-steps",
    "label": "Disney Movies"
  },
  "iron-man": {
    "url": "https://www.disneyplus.com/browse/entity-0c520152-b81f-4c20-9310-003debd1947e",
    "label": "Disney+"
  },
  "iron-man-2": {
    "url": "https://www.disneyplus.com/browse/entity-85c5529d-c053-4fa4-9957-4906eb5aedc6",
    "label": "Disney+"
  },
  "thor": {
    "url": "https://www.disneyplus.com/browse/entity-479d41e3-8438-4ba4-b93d-8223220e069c",
    "label": "Disney+"
  },
  "cap-first": {
    "url": "https://www.disneyplus.com/browse/entity-8e68c43a-117c-4f4d-b217-0db106a1a614",
    "label": "Disney+"
  },
  "avengers": {
    "url": "https://www.disneyplus.com/browse/entity-d2ab699b-67da-4906-a7a4-5bc542c953cf",
    "label": "Disney+"
  },
  "thor-dark": {
    "url": "https://www.disneyplus.com/browse/entity-7c4f4e28-4152-4f64-90ec-8b7f682c33d4",
    "label": "Disney+"
  },
  "deadpool-wolverine": {
    "url": "https://www.disneyplus.com/browse/entity-120ae1e6-2240-4924-a4ce-f8de6e28b0b1",
    "label": "Disney+"
  },
  "agent-carter-1": {
    "url": "https://www.disneyplus.com/browse/entity-e4cbebda-a890-4e99-9a29-40d2162f7d46",
    "label": "Disney+"
  },
  "agent-carter-2": {
    "url": "https://www.disneyplus.com/browse/entity-e4cbebda-a890-4e99-9a29-40d2162f7d46",
    "label": "Disney+"
  },
  "daredevil-1": {
    "url": "https://www.disneyplus.com/browse/entity-b03f0bdc-ebd5-44df-a16a-1a180a88873a",
    "label": "Disney+"
  },
  "daredevil-2": {
    "url": "https://www.disneyplus.com/browse/entity-b03f0bdc-ebd5-44df-a16a-1a180a88873a",
    "label": "Disney+"
  },
  "daredevil-3": {
    "url": "https://www.disneyplus.com/browse/entity-b03f0bdc-ebd5-44df-a16a-1a180a88873a",
    "label": "Disney+"
  },
  "jessica-1": {
    "url": "https://www.disneyplus.com/browse/entity-6e31f304-024a-41a2-97a5-5a7ced0345a8",
    "label": "Disney+"
  },
  "jessica-2": {
    "url": "https://www.disneyplus.com/browse/entity-6e31f304-024a-41a2-97a5-5a7ced0345a8",
    "label": "Disney+"
  },
  "jessica-3": {
    "url": "https://www.disneyplus.com/browse/entity-6e31f304-024a-41a2-97a5-5a7ced0345a8",
    "label": "Disney+"
  },
  "luke-1": {
    "url": "https://www.disneyplus.com/browse/entity-0e8ba0c3-47da-44d4-bab5-1c6f5d6e61a0",
    "label": "Disney+"
  },
  "luke-2": {
    "url": "https://www.disneyplus.com/browse/entity-0e8ba0c3-47da-44d4-bab5-1c6f5d6e61a0",
    "label": "Disney+"
  },
  "iron-fist-1": {
    "url": "https://www.disneyplus.com/browse/entity-d251acf8-4a1a-48d1-b3b7-d9513afeaac0",
    "label": "Disney+"
  },
  "iron-fist-2": {
    "url": "https://www.disneyplus.com/browse/entity-d251acf8-4a1a-48d1-b3b7-d9513afeaac0",
    "label": "Disney+"
  },
  "defenders": {
    "url": "https://www.disneyplus.com/browse/entity-61687bed-4a66-4657-9252-df80ca1d1fbc",
    "label": "Disney+"
  },
  "punisher-1": {
    "url": "https://www.disneyplus.com/browse/entity-bbe154ae-af21-49dd-8129-90077e61c991",
    "label": "Disney+"
  },
  "punisher-2": {
    "url": "https://www.disneyplus.com/browse/entity-bbe154ae-af21-49dd-8129-90077e61c991",
    "label": "Disney+"
  },
  "punisher-special": {
    "url": "https://www.disneyplus.com/browse/entity-c5b69f75-f159-4749-873d-9a1d1a4eb878",
    "label": "Disney+"
  },
  "all-hail": {
    "url": "https://www.disneyplus.com/browse/entity-14988369-345c-4984-9c16-59428bd70609",
    "label": "Disney+"
  },
  "spider-home": {
    "url": "https://www.sonypictures.com/movies/spidermanhomecoming",
    "label": "Sony Pictures"
  },
  "spider-far": {
    "url": "https://www.sonypictures.com/movies/spidermanfarfromhome",
    "label": "Sony Pictures"
  },
  "spider-no": {
    "url": "https://www.sonypictures.com/movies/spidermannowayhome",
    "label": "Sony Pictures"
  },
  "spider-brand": {
    "url": "https://www.sonypictures.com/movies/spidermanbrandnewday",
    "label": "Sony Pictures"
  },
  "xmen": {
    "url": "https://www.20thcenturystudios.com/movies/x-men",
    "label": "20th Century Studios"
  },
  "x2": {
    "url": "https://www.20thcenturystudios.com/movies/x2",
    "label": "20th Century Studios"
  },
  "deadpool": {
    "url": "https://www.20thcenturystudios.com/movies/deadpool",
    "label": "20th Century Studios"
  },
  "deadpool-2": {
    "url": "https://www.20thcenturystudios.com/movies/deadpool-2",
    "label": "20th Century Studios"
  },
  "logan": {
    "url": "https://www.20thcenturystudios.com/movies/logan",
    "label": "20th Century Studios"
  },
  "falcon": {
    "url": "https://www.marvel.com/tv-shows/the-falcon-and-the-winter-soldier/1",
    "label": "Marvel"
  },
  "wandavision": {
    "url": "https://www.marvel.com/tv-shows/wandavision/1",
    "label": "Marvel"
  },
  "loki-1": {
    "url": "https://press.disneyplus.com/media-kits/loki",
    "label": "Disney+ Press"
  },
  "loki-2": {
    "url": "https://press.disneyplus.com/media-kits/loki",
    "label": "Disney+ Press"
  },
  "whatif-1": {
    "url": "https://press.disneyplus.com/media-kits/what-if",
    "label": "Disney+ Press"
  },
  "whatif-2": {
    "url": "https://press.disneyplus.com/media-kits/what-if",
    "label": "Disney+ Press"
  },
  "whatif-3": {
    "url": "https://press.disneyplus.com/media-kits/what-if",
    "label": "Disney+ Press"
  },
  "hawkeye": {
    "url": "https://press.disneyplus.com/media-kits/hawkeye",
    "label": "Disney+ Press"
  },
  "moon-knight": {
    "url": "https://press.disneyplus.com/media-kits/moon-knight",
    "label": "Disney+ Press"
  },
  "ms-marvel": {
    "url": "https://press.disneyplus.com/media-kits/ms-marvel",
    "label": "Disney+ Press"
  },
  "groot-1": {
    "url": "https://press.disneyplus.com/media-kits/i-am-groot",
    "label": "Disney+ Press"
  },
  "groot-2": {
    "url": "https://press.disneyplus.com/media-kits/i-am-groot",
    "label": "Disney+ Press"
  },
  "she-hulk": {
    "url": "https://press.disneyplus.com/media-kits/she-hulk-attorney-at-law",
    "label": "Disney+ Press"
  },
  "secret-invasion": {
    "url": "https://press.disneyplus.com/media-kits/secret-invasion",
    "label": "Disney+ Press"
  },
  "echo": {
    "url": "https://press.disneyplus.com/media-kits/echo",
    "label": "Disney+ Press"
  },
  "agatha": {
    "url": "https://press.disneyplus.com/media-kits/agatha-all-along",
    "label": "Disney+ Press"
  },
  "werewolf": {
    "url": "https://press.disneyplus.com/media-kits/werewolf-by-night",
    "label": "Disney+ Press"
  },
  "guardians-holiday": {
    "url": "https://press.disneyplus.com/media-kits/the-guardians-of-the-galaxy-holiday-special",
    "label": "Disney+ Press"
  },
  "incredible-hulk": {
    "url": "https://www.disneyplus.com/browse/entity-30d00f7b-331a-4f43-b9e1-1989d39cb1a3",
    "label": "Disney+"
  },
  "friendly-spider-1": {
    "url": "https://www.disneyplus.com/browse/entity-b1417e49-48ad-4827-bfd6-94580ecbecd7",
    "label": "Disney+"
  },
  "daredevil-born-1": {
    "url": "https://www.disneyplus.com/browse/entity-85e7a914-c8e6-41db-95df-c740dc2cf1b7",
    "label": "Disney+"
  },
  "daredevil-born-2": {
    "url": "https://www.disneyplus.com/browse/entity-85e7a914-c8e6-41db-95df-c740dc2cf1b7",
    "label": "Disney+"
  },
  "ironheart": {
    "url": "https://www.disneyplus.com/browse/entity-b2b50b9a-a055-4b31-a609-8ec46f3add98",
    "label": "Disney+"
  },
  "eyes-wakanda": {
    "url": "https://www.disneyplus.com/browse/entity-8d16eb3d-b7e5-4c43-abda-a281be4d284a",
    "label": "Disney+"
  },
  "marvel-zombies": {
    "url": "https://www.disneyplus.com/browse/entity-d274138a-7c29-4ddf-9ea2-2f9d3c1a24a0",
    "label": "Disney+"
  },
  "wonder-man": {
    "url": "https://www.disneyplus.com/browse/entity-25ee768f-06e3-491c-ad8f-876b4c87ac42",
    "label": "Disney+"
  },
  "visionquest": {
    "url": "https://www.disneyplus.com/browse/entity-8744ec55-8d14-4631-99b4-c889a2d6013f",
    "label": "Disney+"
  }
};

const HOME_GUIDE = {
  "title": "درباره مسیر مارول",
  "paragraphs": [
    "مسیر مارول یک پروژه مستقل، غیرتجاری و هواداری است که با هدف تسهیل شناخت و دنبال کردن دنیای سینمایی مارول توسعه یافته است. این سرویس صرفا راهنمای ترتیب پیشنهادی تماشا، تاریخ انتشار، خط زمانی داستان و پیوستگی شخصیت‌ها و نقش‌هاست و امکان ثبت پیشرفت شخصی را فراهم می‌کند.",
    "در این وب‌سایت هیچ فیلم یا سریالی میزبانی، پخش یا برای دانلود عرضه نمی‌شود. برای تماشا یا دریافت قانونی آثار، به پلتفرم‌های رسمی و ارائه‌دهندگان معتبر دارای مجوز مراجعه کنید.",
    "مسیر مارول وابسته به Marvel، Marvel Studios یا Disney نیست و مورد تایید رسمی آن‌ها قرار ندارد. تمامی حقوق مالکیت معنوی آثار، نام‌ها، شخصیت‌ها، علائم تجاری و تصاویر متعلق به صاحبان قانونی آن‌هاست. انتشار عمومی کد منبع پروژه به معنای اعطای مجوز استفاده از محتوای متعلق به اشخاص ثالث نیست."
  ],
  "repo": "https://github.com/iMoein/marvel-path",
  "linkLabel": "مشاهده کد منبع در گیت‌هاب"
};

/* Release calendar supplements; deliberately excluded from watch-progress catalogue. */
const RELEASE_CALENDAR_CHECKED="2026-11-19";
const RELEASE_CALENDAR_EXTRA = [
  {
    "id": "xmen97-1",
    "title": "X-Men ’97 — Season 1",
    "fa": "مردان ایکس ۹۷ — فصل ۱",
    "date": "2024-03-20",
    "precision": "day",
    "type": "animation",
    "phase": 0,
    "status": "released",
    "source": "https://thewaltdisneycompany.com/news/x-men-97-marvel-debut-disney/",
    "note": "انیمیشن جهان موازی"
  },
  {
    "id": "xmen97-2",
    "title": "X-Men ’97 — Season 2",
    "fa": "مردان ایکس ۹۷ — فصل ۲",
    "date": "2026-07-01",
    "precision": "day",
    "type": "animation",
    "phase": 0,
    "status": "released",
    "source": "https://www.disneyplus.com/explore/articles/x-men-97-season-2",
    "note": "انیمیشن جهان موازی"
  },
  {
    "id": "doomsday-film",
    "title": "Avengers: Doomsday",
    "fa": "انتقام‌جویان: روز رستاخیز",
    "date": "2026-12-18",
    "precision": "day",
    "type": "movie",
    "phase": 6,
    "status": "planned",
    "source": "https://www.disneyplus.com/explore/articles/marvel-movies-in-order",
    "note": "اکران سینمایی اعلام‌شده"
  },
  {
    "id": "friendly-spider-2",
    "title": "Your Friendly Neighborhood Spider-Man — Season 2",
    "fa": "مرد عنکبوتی همسایه شما — فصل ۲",
    "date": "2027-01-13",
    "precision": "day",
    "type": "animation",
    "phase": 0,
    "status": "planned",
    "source": "https://www.disneyplus.com/whats-on/entity-b1417e49-48ad-4827-bfd6-94580ecbecd7",
    "note": "زمان رسمی پخش در Disney+"
  },
  {
    "id": "daredevil-born-3",
    "title": "Daredevil: Born Again — Season 3",
    "fa": "دردویل: تولد دوباره — فصل ۳",
    "date": "2027",
    "precision": "year",
    "type": "series",
    "phase": 6,
    "status": "planned",
    "source": "https://prensa.disney.es/noticias/new-york-comic-con-presenta-a-visionquest,-daredevil:-born-again-y-un-adelanto-de-las-pr%C3%B3ximas-series-de-marvel-televison-y-marvel-animation-en-disney%2B",
    "note": "فصل پایانی؛ سال پخش اعلام شده"
  },
  {
    "id": "xmen97-3",
    "title": "X-Men ’97 — Season 3",
    "fa": "مردان ایکس ۹۷ — فصل ۳",
    "date": "2027",
    "precision": "year",
    "type": "animation",
    "phase": 0,
    "status": "planned",
    "source": "https://www.murphysmultiverse.com/marvel-studios-confirms-release-windows-for-x-men-97-seasons-3-and-4/",
    "note": "بازه اعلام‌شده توسط مدیر Marvel Television"
  },
  {
    "id": "zombies-winter",
    "title": "Marvel Zombies: The Winter Soldier",
    "fa": "زامبی‌های مارول: سرباز زمستان",
    "date": "2027-10",
    "precision": "halloween",
    "type": "animation",
    "phase": 0,
    "status": "planned",
    "source": "https://prensa.disney.es/noticias/new-york-comic-con-presenta-a-visionquest,-daredevil:-born-again-y-un-adelanto-de-las-pr%C3%B3ximas-series-de-marvel-televison-y-marvel-animation-en-disney%2B",
    "note": "ویژه‌برنامه دو قسمتی؛ حوالی هالووین"
  },
  {
    "id": "secret-wars",
    "title": "Avengers: Secret Wars",
    "fa": "انتقام‌جویان: جنگ‌های پنهان",
    "date": "2027-12-17",
    "precision": "day",
    "type": "movie",
    "phase": 6,
    "status": "planned",
    "source": "https://au.variety.com/2025/film/news/avengers-delayed-doomsday-secret-wars-december-2-22910/",
    "note": "تاریخ اعلام‌شده اکران سینمایی"
  },
  {
    "id": "xmen-new",
    "title": "Untitled X-Men",
    "fa": "فیلم جدید مردان ایکس",
    "date": "2028-05-05",
    "precision": "day",
    "type": "movie",
    "phase": 0,
    "status": "planned",
    "source": "https://thewaltdisneycompany.com/news/d23-2026-disney-entertainment-showcase/",
    "note": "عنوان نهایی اعلام نشده"
  },
  {
    "id": "ghost-rider",
    "title": "Ghost Rider",
    "fa": "گوست رایدر",
    "date": "2028-07-28",
    "precision": "day",
    "type": "movie",
    "phase": 0,
    "status": "planned",
    "source": "https://au.variety.com/2026/film/news/ghost-rider-release-date-marvel-ryan-gosling-39479/",
    "note": "فیلم جدید؛ کار روی پروژه آغاز شده"
  },
  {
    "id": "zodiac",
    "title": "Zodiac",
    "fa": "زودیاک",
    "date": "2028",
    "precision": "year",
    "type": "series",
    "phase": 0,
    "status": "planned",
    "source": "https://prensa.disney.es/noticias/new-york-comic-con-presenta-a-visionquest,-daredevil:-born-again-y-un-adelanto-de-las-pr%C3%B3ximas-series-de-marvel-televison-y-marvel-animation-en-disney%2B",
    "note": "انتخاب بازیگران؛ آغاز تولید برنامه‌ریزی‌شده در ۲۰۲۷"
  },
  {
    "id": "xmen97-4",
    "title": "X-Men ’97 — Season 4",
    "fa": "مردان ایکس ۹۷ — فصل ۴",
    "date": "2028",
    "precision": "year",
    "type": "animation",
    "phase": 0,
    "status": "planned",
    "source": "https://www.murphysmultiverse.com/marvel-studios-confirms-release-windows-for-x-men-97-seasons-3-and-4/",
    "note": "بازه اعلام‌شده توسط مدیر Marvel Television"
  },
  {
    "id": "zombies-khonshu",
    "title": "Marvel Zombies: The Fist of Khonshu",
    "fa": "زامبی‌های مارول: مشت خونشو",
    "date": "2028-10",
    "precision": "halloween",
    "type": "animation",
    "phase": 0,
    "status": "planned",
    "source": "https://prensa.disney.es/noticias/new-york-comic-con-presenta-a-visionquest,-daredevil:-born-again-y-un-adelanto-de-las-pr%C3%B3ximas-series-de-marvel-televison-y-marvel-animation-en-disney%2B",
    "note": "ویژه‌برنامه دو قسمتی؛ حوالی هالووین"
  },
  {
    "id": "black-panther-3",
    "title": "Black Panther 3",
    "fa": "پلنگ سیاه ۳",
    "date": "2028-12-15",
    "precision": "day",
    "type": "movie",
    "phase": 0,
    "status": "planned",
    "source": "https://thewaltdisneycompany.com/news/marvel-studios-comic-con-2026/",
    "note": "اکران سینمایی اعلام‌شده"
  },
  {
    "id": "zombies-guardian",
    "title": "Marvel Zombies: The Last Guardian",
    "fa": "زامبی‌های مارول: آخرین نگهبان",
    "date": "2029-10",
    "precision": "halloween",
    "type": "animation",
    "phase": 0,
    "status": "planned",
    "source": "https://prensa.disney.es/noticias/new-york-comic-con-presenta-a-visionquest,-daredevil:-born-again-y-un-adelanto-de-las-pr%C3%B3ximas-series-de-marvel-televison-y-marvel-animation-en-disney%2B",
    "note": "ویژه‌برنامه دو قسمتی؛ حوالی هالووین"
  }
];
