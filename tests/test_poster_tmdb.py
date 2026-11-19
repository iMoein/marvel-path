import sys
from pathlib import Path
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import metadata_service as m
import server

class PosterDiscovery(unittest.TestCase):
    def setUp(self):
        p=patch.object(m,'atomic_json');p.start();self.addCleanup(p.stop)

    def test_each_season_prioritized(self):
        def api(path,params=None):
            if path=='/tv/138502':return {'name':"X-Men '97",'poster_path':'/series.jpg'}
            return {'poster_path':'/s'+path[-1]+'.jpg'}
        with patch.object(m,'token',return_value='test'),patch.object(m,'get_json',return_value={'tmdbId':138502}),patch.object(m,'tmdb',side_effect=api):
            for n in (1,2):
                urls=m.tmdb_poster_candidates('xmen97-'+str(n))
                self.assertEqual(urls,[m.safe_image('/s'+str(n)+'.jpg','w500'),m.safe_image('/series.jpg','w500')])
    def test_missing_season_image_falls_back_to_season_gallery(self):
        def api(path,params=None):
            if path.endswith('/images'):return {'posters':[{'file_path':'/gallery.jpg'}]}
            if '/season/' in path:return {}
            return {'name':"X-Men '97",'poster_path':'/series.jpg'}
        with patch.object(m,'token',return_value='test'),patch.object(m,'get_json',return_value={'tmdbId':138502}),patch.object(m,'tmdb',side_effect=api):
            self.assertEqual(m.tmdb_poster_candidates('xmen97-1')[0],m.safe_image('/gallery.jpg','w500'))
    def test_wrong_series_rejected(self):
        with patch.object(m,'token',return_value='test'),patch.object(m,'get_json',return_value={'tmdbId':1}),patch.object(m,'tmdb',return_value={'name':'Wrong','poster_path':'/wrong.jpg'}):
            with self.assertRaises(ValueError):m.tmdb_poster_candidates('xmen97-1')
    def test_unknown_title_and_no_key(self):
        with patch.object(m,'token',return_value=''):
            self.assertEqual(m.tmdb_poster_candidates('xmen97-1'),[])
            self.assertEqual(m.tmdb_poster_candidates('nonexistent'),[])
    def test_server_fallback_preserves_manual_priority(self):
        fallback='https://image.tmdb.org/t/p/w500/fallback.jpg'
        custom='https://image.tmdb.org/t/p/w500/custom.jpg'
        with patch.object(server.metadata,'tmdb_poster_candidates',return_value=[fallback]) as discover,patch.object(server,'fetch_image',return_value=b'image') as fetch,patch.object(server,'store_image') as store:
            self.assertTrue(server.store_from_urls('xmen97-1',[custom],force=True)[0])
            discover.assert_not_called()
            store.assert_called_once_with('xmen97-1',b'image',custom)
            store.reset_mock()
            self.assertTrue(server.store_from_urls('xmen97-2',[],force=True)[0])
            store.assert_called_once_with('xmen97-2',b'image',fallback)
    def test_failed_curated_urls_then_discovery(self):
        url='https://image.tmdb.org/t/p/w500/valid.jpg'
        with patch.object(server.metadata,'tmdb_poster_candidates',return_value=[url]),patch.object(server,'fetch_image',side_effect=[ValueError('bad'),b'image']),patch.object(server,'store_image') as store:
            self.assertTrue(server.store_from_urls('xmen97-1',['https://image.tmdb.org/t/p/w500/bad.jpg'],force=True)[0])
            store.assert_called_once_with('xmen97-1',b'image',url)
    def test_metadata_keeps_season_poster(self):
        def api(path,params=None):
            return {'poster_path':'/season.jpg','episodes':[]} if '/season/' in path else {'poster_path':'/series.jpg'}
        with patch.object(m,'title_record',return_value={'tmdbId':138502}),patch.object(m,'tmdb',side_effect=api):
            r=m.title_info_tmdb('xmen97-1',m.lookup['xmen97-1'])
            self.assertEqual(r['poster'],m.safe_image('/season.jpg','w500'))
            self.assertEqual(r['seriesPoster'],m.safe_image('/series.jpg','w500'))

if __name__=='__main__':unittest.main()
