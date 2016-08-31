'''
Created on Aug 29, 2016

@author: paepcke
'''

import tornado.ioloop
import tornado.web

class UxRecorder(tornado.web.RequestHandler):

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def get(self):
        self.write("Hello, world")
        
    def post(self):
        print(self.get_body_argument("message"))
        
    def options(self):
        # no body
        self.set_status(204)
        self.finish()        

def make_app():
    return tornado.web.Application([
        (r"/", UxRecorder),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8889)
    tornado.ioloop.IOLoop.current().start()
