#!/usr/bin/env python3
"""Curated offline starter credits: a small, explicitly non-exhaustive set.
Never presented as authoritative TMDB credits; refresh via the local admin.
"""
import json
from pathlib import Path
import metadata_service as m
# Actor | character | comma-separated local catalogue identifiers
ROWS = '''
Robert Downey Jr.|Tony Stark / Iron Man|iron-man,iron-man-2,iron-man-3,avengers,avengers-ultron,civil-war,infinity-war,endgame,spider-home
Chris Evans|Steve Rogers / Captain America|cap-first,avengers,cap-winter,avengers-ultron,civil-war,infinity-war,endgame
Chris Hemsworth|Thor|thor,avengers,thor-dark,avengers-ultron,thor-ragnarok,infinity-war,endgame,thor-love
Mark Ruffalo|Bruce Banner / Hulk|avengers,avengers-ultron,thor-ragnarok,infinity-war,endgame,she-hulk
Edward Norton|Bruce Banner / Hulk|incredible-hulk
Scarlett Johansson|Natasha Romanoff / Black Widow|iron-man-2,avengers,cap-winter,avengers-ultron,civil-war,infinity-war,endgame,black-widow
Jeremy Renner|Clint Barton / Hawkeye|thor,avengers,avengers-ultron,civil-war,endgame,hawkeye
Tom Hiddleston|Loki|thor,avengers,thor-dark,thor-ragnarok,infinity-war,endgame,loki-1,loki-2
Samuel L. Jackson|Nick Fury|iron-man,iron-man-2,thor,cap-first,avengers,cap-winter,avengers-ultron,infinity-war,endgame,spider-far,captain-marvel,marvels,secret-invasion
Gwyneth Paltrow|Pepper Potts|iron-man,iron-man-2,iron-man-3,spider-home,infinity-war,endgame
Don Cheadle|James Rhodes / War Machine|iron-man-2,iron-man-3,avengers-ultron,civil-war,infinity-war,endgame,secret-invasion
Paul Bettany|Vision|avengers-ultron,civil-war,infinity-war,wandavision,visionquest
Elizabeth Olsen|Wanda Maximoff / Scarlet Witch|avengers-ultron,civil-war,infinity-war,endgame,wandavision,strange-mom
Benedict Cumberbatch|Stephen Strange / Doctor Strange|doctor-strange,thor-ragnarok,infinity-war,endgame,spider-no,strange-mom
Benedict Wong|Wong|doctor-strange,infinity-war,endgame,spider-no,strange-mom,shang-chi
Tom Holland|Peter Parker / Spider-Man|civil-war,spider-home,infinity-war,endgame,spider-far,spider-no,spider-brand
Zendaya|MJ|spider-home,spider-far,spider-no
Jacob Batalon|Ned Leeds|spider-home,spider-far,spider-no
Marisa Tomei|May Parker|civil-war,spider-home,spider-far,spider-no
Chris Pratt|Peter Quill / Star-Lord|guardians-1,guardians-2,infinity-war,endgame,guardians-3,guardians-holiday
Zoe Saldaña|Gamora|guardians-1,guardians-2,infinity-war,endgame,guardians-3
Dave Bautista|Drax|guardians-1,guardians-2,infinity-war,endgame,guardians-3,guardians-holiday
Vin Diesel|Groot (voice)|guardians-1,guardians-2,infinity-war,endgame,guardians-3,groot-1,groot-2,guardians-holiday
Bradley Cooper|Rocket (voice)|guardians-1,guardians-2,infinity-war,endgame,guardians-3,guardians-holiday
Karen Gillan|Nebula|guardians-1,guardians-2,infinity-war,endgame,guardians-3,guardians-holiday
Pom Klementieff|Mantis|guardians-2,infinity-war,endgame,guardians-3,guardians-holiday
Paul Rudd|Scott Lang / Ant-Man|ant-man,civil-war,antman-wasp,endgame,quantumania
Evangeline Lilly|Hope van Dyne / Wasp|ant-man,antman-wasp,endgame,quantumania
Michael Douglas|Hank Pym|ant-man,antman-wasp,endgame,quantumania
Brie Larson|Carol Danvers / Captain Marvel|captain-marvel,endgame,marvels
Teyonah Parris|Monica Rambeau|wandavision,marvels
Iman Vellani|Kamala Khan / Ms. Marvel|ms-marvel,marvels
Chadwick Boseman|T'Challa / Black Panther|civil-war,black-panther,infinity-war,endgame
Letitia Wright|Shuri / Black Panther|black-panther,infinity-war,endgame,wakanda
Danai Gurira|Okoye|black-panther,infinity-war,endgame,wakanda
Winston Duke|M'Baku|black-panther,infinity-war,endgame,wakanda
Lupita Nyong'o|Nakia|black-panther,wakanda
Tenoch Huerta Mejía|Namor|wakanda
Simu Liu|Shang-Chi|shang-chi
Tony Leung Chiu-wai|Xu Wenwu|shang-chi
Awkwafina|Katy|shang-chi
Ben Kingsley|Trevor Slattery|iron-man-3,all-hail,shang-chi
Anthony Mackie|Sam Wilson / Captain America|cap-winter,ant-man,civil-war,infinity-war,endgame,falcon,cap-brave
Sebastian Stan|Bucky Barnes / Winter Soldier|cap-first,cap-winter,civil-war,infinity-war,endgame,falcon,thunderbolts
Daniel Brühl|Helmut Zemo|civil-war,falcon
Wyatt Russell|John Walker / U.S. Agent|falcon,thunderbolts
Florence Pugh|Yelena Belova|black-widow,hawkeye,thunderbolts
David Harbour|Alexei Shostakov / Red Guardian|black-widow,thunderbolts
Hannah John-Kamen|Ava Starr / Ghost|antman-wasp,thunderbolts
Julia Louis-Dreyfus|Valentina Allegra de Fontaine|falcon,black-widow,thunderbolts
Ryan Reynolds|Wade Wilson / Deadpool|deadpool,deadpool-2,deadpool-wolverine
Hugh Jackman|Logan / Wolverine|xmen,x2,logan,deadpool-wolverine
Patrick Stewart|Charles Xavier|xmen,x2,strange-mom
Ian McKellen|Erik Lehnsherr / Magneto|xmen,x2
Halle Berry|Ororo Munroe / Storm|xmen,x2
Famke Janssen|Jean Grey|xmen,x2
James Marsden|Scott Summers / Cyclops|xmen,x2
Anna Paquin|Rogue|xmen,x2
Kelsey Grammer|Hank McCoy / Beast|marvels
Kathryn Hahn|Agatha Harkness|wandavision,agatha
Joe Locke|Billy Maximoff|agatha
Paul Bettany|White Vision|visionquest
Oscar Isaac|Marc Spector / Moon Knight|moon-knight
Charlie Cox|Matt Murdock / Daredevil|daredevil-1,daredevil-2,daredevil-3,spider-no,echo,daredevil-born-1,daredevil-born-2
Vincent D'Onofrio|Wilson Fisk / Kingpin|daredevil-1,daredevil-2,daredevil-3,hawkeye,echo,daredevil-born-1,daredevil-born-2
Krysten Ritter|Jessica Jones|jessica-1,jessica-2,jessica-3,defenders
Mike Colter|Luke Cage|luke-1,luke-2,defenders,jessica-1
Finn Jones|Danny Rand / Iron Fist|iron-fist-1,iron-fist-2,defenders,luke-2
Jon Bernthal|Frank Castle / Punisher|daredevil-2,punisher-1,punisher-2,daredevil-born-1,punisher-special
Hayley Atwell|Peggy Carter|cap-first,cap-winter,ant-man,endgame,agent-carter-1,agent-carter-2,strange-mom
Pedro Pascal|Reed Richards / Mister Fantastic|fantastic-four
Vanessa Kirby|Sue Storm / Invisible Woman|fantastic-four
Joseph Quinn|Johnny Storm / Human Torch|fantastic-four
Ebon Moss-Bachrach|Ben Grimm / Thing|fantastic-four
Dominique Thorne|Riri Williams / Ironheart|wakanda,ironheart
Alaqua Cox|Maya Lopez / Echo|hawkeye,echo
Tatiana Maslany|Jennifer Walters / She-Hulk|she-hulk
Gemma Chan|Sersi|eternals
Richard Madden|Ikaris|eternals
Angelina Jolie|Thena|eternals
Salma Hayek|Ajak|eternals
Kumail Nanjiani|Kingo|eternals
Brian Tyree Henry|Phastos|eternals
Ma Dong-seok|Gilgamesh|eternals
Lauren Ridloff|Makkari|eternals
Lia McHugh|Sprite|eternals
Barry Keoghan|Druig|eternals
Kit Harington|Dane Whitman|eternals
Jeffrey Wright|The Watcher (voice)|whatif-1,whatif-2,whatif-3
Hudson Thames|Peter Parker / Spider-Man (voice)|friendly-spider-1
Colman Domingo|Norman Osborn (voice)|friendly-spider-1
Iman Vellani|Kamala Khan (voice)|marvel-zombies
Yahya Abdul-Mateen II|Simon Williams|wonder-man
Ben Kingsley|Trevor Slattery|wonder-man
Gael García Bernal|Jack Russell / Werewolf|werewolf
Laura Donnelly|Elsa Bloodstone|werewolf
Harriet Sansom Harris|Verussa Bloodstone|werewolf
'''
cast_by_title={}
for line in ROWS.strip().splitlines():
    name,role,ids=line.split('|')
    for tid in ids.split(','):
        if tid not in m.CATALOG:
            print('Unknown ID',tid);continue
        cast_by_title.setdefault(tid,[]).append(m.cast_item(name,role,'',None,len(cast_by_title.get(tid,[]))))
for id_,cast in cast_by_title.items():
    path=m.TITLES/(id_+'.json')
    if path.exists():continue
    item=m.lookup[id_]
    m.atomic_json(path,{'id':id_,'title':m.CATALOG[id_], 'overview':'','tagline':'','genres':[], 'cast':cast,'episodes':[], 'director':'', 'type':item['kind'],'season':item['season'], 'source':'گزیده بازیگران (آفلاین؛ غیرجامع)','sourceUrl':'','fetchedAt':m.clock(),'selectionOnly':True})
m.write_index_from_titles()
print('Seeded',len(cast_by_title),'titles and',len(m.read_index()['people']),'actor profiles.')
