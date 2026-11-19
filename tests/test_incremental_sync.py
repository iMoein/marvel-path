import sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import metadata_service as m
import server
import episode_cache as ec

ID='xmen97-1'
IMG='https://image.tmdb.org/t/p/w300/example.jpg'
POSTER='https://image.tmdb.org/t/p/w500/season.jpg'
WEBP=b'RIFF'+b'\0'*4+b'WEBP'+b'\0'*50

def complete():
    return {'id':ID,'tmdbId':138502,'overview':'Original synopsis','cast':[{'personId':'actor','name':'Actor'}],
            'episodes':[{'number':n,'name':f'Episode {n}','overview':'Original episode','runtime':25,'airDate':'2024-03-20'} for n in range(1,11)]}

class Incremental(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup)
        root=Path(tmp.name)
        for module,name,folder in [(m,'TITLES',root/'titles'),(m,'POSTER_LOOKUPS',root/'lookups'),(ec,'CACHE',root/'stills'),(server,'POSTER_DIR',root/'posters')]:
            folder.mkdir();p=patch.object(module,name,folder);p.start();self.addCleanup(p.stop)
        p=patch.object(server,'MANIFEST_PATH',server.POSTER_DIR/'manifest.json');p.start();self.addCleanup(p.stop)
        p=patch.object(m,'JOB',{'running':False,'errors':[]});p.start();self.addCleanup(p.stop)
    def save(self,r):m.atomic_json(m.TITLES/(ID+'.json'),r)
    def test_complete_record_no_api_and_no_write(self):
        self.save(complete());before=(m.TITLES/(ID+'.json')).read_bytes()
        with patch.object(m,'title_info_tmdb') as remote,patch.object(ec,'cache_record') as cache:
            self.assertEqual(m.sync_one(ID),complete())
            remote.assert_not_called();cache.assert_not_called()
        self.assertEqual((m.TITLES/(ID+'.json')).read_bytes(),before)
    def test_complete_batch_no_worker(self):
        self.save(complete())
        with patch.object(m.threading,'Thread') as thread:
            job=m.start_job([ID])
            self.assertFalse(job['running']);self.assertEqual(job['skipped'],1);self.assertEqual(job['total'],0)
            thread.assert_not_called()
    def test_only_incomplete_selected(self):
        self.save(complete())
        with patch.object(m.threading,'Thread') as thread:
            job=m.start_job([ID,'xmen97-2'])
            self.assertEqual(job['total'],1);self.assertEqual(job['skipped'],1)
            self.assertEqual(thread.call_args.kwargs['args'],(['xmen97-2'],False))
    def test_images_only_no_title_api(self):
        r=complete();r['episodes'][0]['image']=IMG;self.save(r)
        with patch.object(m,'title_info_tmdb') as remote,patch.object(ec,'cache_record',return_value={'failed':0}) as cache:
            m.sync_one(ID);remote.assert_not_called();cache.assert_called_once()
    def test_missing_metadata_preserves_existing_fields(self):
        old=complete();old['episodes'][0]['overview']='';old['episodes'][0]['image']=IMG;self.save(old)
        new=complete();new['overview']='Different synopsis';new['cast']=[];new['episodes'][0]['overview']='New detail'
        with patch.object(m,'token',return_value='test'),patch.object(m,'title_info_tmdb',return_value=new),patch.object(m,'cache_cast_photos'),patch.object(ec,'cache_record',return_value={'failed':0}):
            result=m.sync_one(ID)
        self.assertEqual(result['overview'],old['overview']);self.assertEqual(result['cast'],old['cast'])
        self.assertEqual(result['episodes'][0]['overview'],'New detail');self.assertEqual(result['episodes'][0]['image'],IMG)
    def test_explicit_refresh_changes_populated_fields(self):
        old=complete();self.save(old);new=complete();new['overview']='Updated synopsis';new['cast']=[]
        with patch.object(m,'token',return_value='test'),patch.object(m,'title_info_tmdb',return_value=new) as remote,patch.object(m,'cache_cast_photos'),patch.object(ec,'cache_record',return_value={'failed':0}):
            result=m.sync_one(ID,force=True)
        remote.assert_called_once();self.assertEqual(result['overview'],'Updated synopsis');self.assertEqual(result['cast'],old['cast'])
    def test_existing_poster_skips_all_network(self):
        server.store_image(ID,WEBP,POSTER)
        with patch.object(server,'fetch_image') as fetch,patch.object(m,'tmdb_poster_candidates') as discover:
            self.assertTrue(server.store_from_urls(ID,[POSTER])[0])
            fetch.assert_not_called();discover.assert_not_called()
    def test_missing_file_and_cached_url_without_discovery(self):
        r=complete();r['poster']=POSTER;self.save(r)
        server.store_image(ID,WEBP,POSTER);(server.POSTER_DIR/(ID+'.webp')).unlink()
        self.assertNotIn(ID,server.available_manifest())
        with patch.object(server,'fetch_image',return_value=WEBP) as fetch,patch.object(m,'tmdb_poster_candidates') as discover:
            self.assertTrue(server.store_from_urls(ID,[])[0])
            fetch.assert_called_once_with(POSTER);discover.assert_not_called()
        self.assertIn(ID,server.available_manifest())
    def test_bad_source_not_marked_complete(self):
        old=complete();old['sourceMismatch']=True;self.assertEqual(m.title_missing(ID,old),['source'])

if __name__=='__main__':unittest.main()
