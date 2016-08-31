'''
Created on Aug 29, 2016

@author: paepcke
'''

import json
import logging

import tornado.ioloop
import tornado.web


class UxRecorder(tornado.web.RequestHandler):

    # Remember whether logging has been initialized (class var!):
    loggingInitialized = False
    logger = None
    
    def initialize(self, loggingLevel=logging.INFO, logFile=None):
        '''
        :param loggingLevel: level at which logging output is show. 
        :type loggingLevel: {logging.DEBUG | logging.WARN | logging.INFO | logging.ERROR | logging.CRITICAL}
        :param logFile: path to file where log is to be written. Default is None: log to stdout.
                        A warning is logged if logFile is None and the destination is OutputPipe. In this
                        case logging messages will be mixed in with the data output
        :type logFile: String
        
        '''
        
        self.setupLogging(loggingLevel, logFile)        
        

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def get(self):
        #self.write(self.request.remote_ip)
        #print(self.request.remote_ip);
        pass
        
    def post(self):
        try:
            body = self.request.body
            reqMsg  = json.loads(body)
        except Exception as e:
            UxRecorder.logger.error("Bad request '%s' (%s)" % (body, `e`))
            return
            
        # Handle requests that want an answer:
        try:
            reqType = reqMsg['type']
        except KeyError:
            # Msg is just a logging report:
            UxRecorder.logger.info(reqMsg)
            return
        
        # Answer needed:
        if reqType == "myIp":
            self.write(self.request.remote_ip)
        
    def setupLogging(self, loggingLevel, logFile):
        if UxRecorder.loggingInitialized:
            # Remove previous file- or console-handlers,
            # else we get logging output doubled:
            UxRecorder.logger.handlers = []
            
        # Set up logging:
        UxRecorder.logger = logging.getLogger('uxlogging')
        UxRecorder.logger.setLevel(loggingLevel)
        # Create file handler if requested:
        if logFile is not None:
            handler = logging.FileHandler(logFile)
        else:
            # Create console handler:
            handler = logging.StreamHandler()
        handler.setLevel(loggingLevel)
#         # create formatter and add it to the handlers
#         formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
#         fh.setFormatter(formatter)
#         ch.setFormatter(formatter)
        # Add the handler to the logger
        UxRecorder.logger.addHandler(handler)
        #**********************
        #UxRecorder.logger.info("Info for you")
        #UxRecorder.logger.warn("Warning for you")
        #UxRecorder.logger.debug("Debug for you")
        #**********************
        
        UxRecorder.loggingInitialized = True

        
    def options(self):
        # no body
        self.set_status(204)
        self.finish()
        
    def log(self, txt):
        pass        

def make_app():
    return tornado.web.Application([
        (r"/", UxRecorder),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8889)
    tornado.ioloop.IOLoop.current().start()
