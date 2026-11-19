"""Validate final Persian build, source preservation and known bad source guards."""
import json
import re
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import localize_catalog as loc

SRC=ROOT/'public-data'
OUT=ROOT/'docs/public-data'
def record(p):return json.loads(p.read_text())['data']

class FinalLocalization(unittest.TestCase):
    def verify_fields(self,a,b,keys):
        for key in keys:
            v=a.get(key)
            if not isinstance(v,str) or not v.strip():continue
            self.assertEqual(b.get(key),v)
            self.assertRegex(b.get(key+'Fa',''),r'[\u0600-\u06ff]')
    def test_titles_and_episodes(self):
        counts={'overviews':0,'episodes':0,'roles':0}
        for f in sorted((SRC/'titles').glob('*.json')):
            a,b=record(f),record(OUT/'titles'/f.name)
            if loc.source_mismatch(f.stem,a):
                self.assertTrue(b.get('sourceMismatch'))
                self.assertFalse(b.get('overviewFa'))
                continue
            self.verify_fields(a,b,['overview','tagline','director'])
            counts['overviews']+=bool(a.get('overview'))
            for e,n in zip(a.get('episodes',[]),b.get('episodes',[])):
                self.verify_fields(e,n,['name','overview'])
                counts['episodes']+=bool(e.get('name') and e.get('overview'))
            for c,n in zip(a.get('cast',[]),b.get('cast',[])):
                self.verify_fields(c,n,['name'])
                if c.get('character'):
                    self.assertTrue(n.get('characterFa'),(f.stem,c['character']))
                    counts['roles']+=1
        print('Title coverage:',counts)
    def test_people_and_directory(self):
        counts={'names':0,'bios':0,'birthplaces':0}
        for f in sorted((SRC/'people').glob('*.json')):
            a,b=record(f),record(OUT/'people'/f.name)
            self.verify_fields(a,b,['name','bio','birthPlace'])
            counts['names']+=bool(a.get('name'))
            counts['bios']+=bool(a.get('bio'))
            counts['birthplaces']+=bool(a.get('birthPlace'))
        d=json.loads((OUT/'people.json').read_text())['items']
        self.assertEqual(len(d),counts['names'])
        self.assertTrue(all(p.get('nameFa') for p in d))
        print('Actor coverage:',counts)
    def test_source_fingerprint(self):
        row={'overview':'Changed text'}
        loc.field(row,'overview',{'sha256':'incorrect','fa':'متن اشتباه'})
        self.assertNotIn('overviewFa',row)
    def test_known_wrong_sources(self):
        self.assertTrue(loc.source_mismatch('defenders',{'tvmazeId':1217}))
        self.assertTrue(loc.source_mismatch('defenders',{'tmdbId':32736}))
        self.assertTrue(loc.source_mismatch('daredevil-3',{'tmdbId':207555}))

if __name__=='__main__':unittest.main()
