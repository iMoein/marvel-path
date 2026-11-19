import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import episode_cache as ec

URL='https://image.tmdb.org/t/p/w300/example.jpg'
WEBP=b'RIFF'+b'\0'*4+b'WEBP'+b'\0'*50

class EpisodeCacheTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        for name,folder in [('CACHE',root/'cache'),('PUBLIC',root/'public')]:
            folder.mkdir()
            p=patch.object(ec,name,folder);p.start();self.addCleanup(p.stop)
    def test_reuse_public_image_without_network(self):
        (ec.PUBLIC/(ec.key(URL)+'.webp')).write_bytes(WEBP)
        with patch.object(ec,'download') as net:
            self.assertEqual(ec.ensure(URL),'reused')
            self.assertEqual(ec.ensure(URL),'cached')
            net.assert_not_called()
        self.assertEqual(ec.local_url(URL),'/assets/episodes/'+ec.key(URL)+'.webp')
    def test_download_once_and_validate_bytes(self):
        with patch.object(ec,'download',return_value=WEBP) as net:
            self.assertEqual(ec.ensure(URL),'downloaded')
            self.assertEqual(ec.ensure(URL),'cached')
            net.assert_called_once_with(URL)
    def test_invalid_host_and_payload(self):
        with patch.object(ec,'download',return_value=b'not an image') as net:
            self.assertEqual(ec.ensure('https://evil.example/a.jpg'),'invalid')
            self.assertEqual(ec.ensure(URL),'failed')
            net.assert_called_once_with(URL)
        self.assertEqual(ec.local_url(URL),'')
    def test_api_local_paths_only_and_source_preserved(self):
        record={'episodes':[{'number':1,'image':URL},{'number':2,'image':'https://evil.example/a.jpg'}]}
        with patch.object(ec,'download',return_value=WEBP):
            ec.cache_record(record)
        result=ec.localize_record(record)
        self.assertTrue(result['episodes'][0]['image'].startswith('/assets/episodes/'))
        self.assertEqual(result['episodes'][1]['image'],'')
        self.assertEqual(record['episodes'][0]['image'],URL)
    def test_missing_image_does_not_fetch_on_view(self):
        with patch.object(ec,'download') as net:
            self.assertEqual(ec.localize_record({'episodes':[{'image':URL}]})['episodes'][0]['image'],'')
            net.assert_not_called()
    def test_reject_credentials_redirect_and_queries(self):
        for u in ('http://image.tmdb.org/p.jpg','https://image.tmdb.org@evil.example/p.jpg','https://image.tmdb.org/p.jpg?token=abc','https://image.tmdb.org/p.jpg#x'):
            self.assertFalse(ec.allowed(u))

if __name__=='__main__':unittest.main()
