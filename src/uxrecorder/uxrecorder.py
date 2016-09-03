#!/usr/bin/env python

'''
Created on Aug 29, 2016

@author: paepcke
'''

import datetime
import json
import logging
import os
import re
import time

import tornado.ioloop
import tornado.web


class UxRecorder(tornado.web.RequestHandler):

    # Remember whether logging has been initialized (class var!):
    loggingInitialized = False
    logger = None
    
    TEST_UID_DB = {"test*" : ''}

    #---------------------------
    # prepare 
    #----------------*/

    def prepare(self):
        self.set_default_headers()
        
    #---------------------------
    # initialize 
    #----------------*/

    def initialize(self):
        '''
        Called for each incoming request.
      
        '''
        pass
        
    #---------------------------
    # initializeOnce 
    #----------------*/
    
    @classmethod
    def initializeOnce(cls, loggingLevel=logging.INFO, logFile=None, uidFile=None):
        '''
        :param loggingLevel: level at which logging output is show. 
        :type loggingLevel: {logging.DEBUG | logging.WARN | logging.INFO | logging.ERROR | logging.CRITICAL}
        :param logFile: path to file where log is to be written. Default is None: log to stdout.
                        A warning is logged if logFile is None and the destination is OutputPipe. In this
                        case logging messages will be mixed in with the data output
        :type logFile: String
        
        '''

        logDest = cls.setupLogging(loggingLevel, logFile, utc=True)
        # Regex pattern for excaping CSV separator in log entries:
        cls.csvSeparatorRe = re.compile(r'\|')
        cls.uidDict = cls.loadUserIds(uidFile)
        
        timeNow = datetime.datetime.now().isoformat()
        numUids = len(cls.uidDict.keys())
        # This being a class method we don't
        # yet have self.logInfo(), which would
        # add separator ('|') and quotes around txt.
        # So do that here:
        cls.logger.info('|Start logging UTC times at %s (local time), numUids: %s.' %\
                        (timeNow, numUids))
                
        print('''Started statlet ux recorder at %s
                Time zone: UTC-logging 
                To: %s
                Number of login names found: %s
                ''' % \
              (timeNow, logDest, numUids))
              
    #---------------------------
    # get
    #----------------*/

    def get(self):
        #self.write(self.request.remote_ip)
        #print(self.request.remote_ip);
        pass
    
    #---------------------------
    # post 
    #----------------*/
        
    def post(self):
    
        try:
            body = self.request.body
            reqMsg  = json.loads(body)
        except Exception as e:
            self.logError("Bad request '%s' (%s)" % (body, `e`))
            return
            
        # Handle requests that want an answer:
        try:
            reqType = reqMsg['reqType']
        except KeyError:
            # Msg is just a logging report:
            self.logInfo(reqMsg)
            return
        
        # Answer needed:
        if reqType == "myIp":
            self.write(self.request.remote_ip)
            
        elif reqType == "login":
            try:
                userId = reqMsg['userId']
            except KeyError:
                self.write("Software error: Login request without login name.")
                return
            if self.isRegistered(userId):
                self.write("loginOK")
                self.logInfo('{login : "%s"}' % userId)
            else:
                self.write("loginNOK")
                self.logInfo('{loginFail : "%s"}' % userId)

    #---------------------------
    # isRegistered 
    #----------------*/
            
    def isRegistered(self, loginId):
        try:
            self.uidDict[loginId]
            return True
        except KeyError:
            return False

    #---------------------------
    # loadUserIds
    #----------------*/

    @classmethod
    def loadUserIds(self, uidFile):

        uidDict = {}
        if uidFile is None:
            return UxRecorder.TEST_UID_DB
        try:
            with open(uidFile, 'r') as uidsFd:
                for uidLine in uidsFd:
                    uidDict[uidLine.strip()] = ""
        except:
            self.logError("Could not read uid file %s (using stub dict): " % uidFile)
            return UxRecorder.TEST_UID_DB

        return uidDict    
    
    #---------------------------
    # setupLogging
    #----------------*/
    
        
    @classmethod        
    def setupLogging(self, loggingLevel=logging.INFO, logFile=None, utc=False):
        '''

        Example use raw:
        	UxRecorder.logger.info("Info for you")
        	UxRecorder.logger.warn("Warning for you")
        	UxRecorder.logger.debug("Debug for you")
        	
        Good move: set self.log to UxRecorder.logger
                   then:
            log.info(...)
            log.warn(...)
            etc.
            
        Even better move (potentially):
            write instance methods logInfo(), logWarn(), etc.,
            which might add quotes around txt, and a record
            separator for easy CSV reading later on.
        
        :param loggingLevel: one of logging.INFO, logging.WARN, logging.ERROR.
                For more option see Python logging doc.
        :type loggingLevel: int
        :param logFile: if a path, append to that file. If None, log to console.
        :type logFile: { string | None }
        :param utc: if true, time included in log entries is in Coordinated Universal Time
                (formerly GMT)
        :type utc: bool
        :return passed-in file path, or "console" if logFile is None.
        :raise IOError if logging to file is requested, but file not writeable.
        '''
        
        if UxRecorder.loggingInitialized:
            # Remove previous file- or console-handlers,
            # else we get logging output doubled:
            UxRecorder.logger.handlers = []
            
        # Set up logging:
        UxRecorder.logger = logging.getLogger('uxlogging')
        UxRecorder.logger.setLevel(loggingLevel)

        # Create file handler if requested:
        if logFile is not None:
            # If the file does not exist, create it:
            if not os.access(logFile, os.F_OK):
                with open(logFile, 'a') as fd:  # @UnusedVariable
                    pass
            if not os.access(logFile, os.W_OK):
                raise IOError("Requested log file location not writable: %s" % logFile)
            
            handler = logging.FileHandler(logFile)
        else:
            # Create console handler:
            handler = logging.StreamHandler()
        
        if utc:
            logging.Formatter.converter = time.gmtime
            
        # Create formatter and add it to the handlers
        #formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        formatter = logging.Formatter('%(asctime)s: %(message)s')
        handler.setFormatter(formatter)

        # Add the handler to the logger
        UxRecorder.logger.addHandler(handler)
        
        UxRecorder.loggingInitialized = True
        if logFile is not None:
            return logFile
        else:
            return "concole"

    #---------------------------
    # logInfo, logError, logWarn 
    #----------------*/

    def logInfo(self, txt):
        '''
        Convenience method for logging. 
        Prepends record separator '|'.
        Escapes any occurrences of '|'
        in text.
        
        :param txt: text to log
        :type txt: string
        '''
        
        UxRecorder.logger.info('|%s' % UxRecorder.csvSeparatorRe.sub("\|", txt))
        
    def logError(self, txt):
        '''
        Convenience method for logging.
        Adds "error" to standard logging line header. 
        Prepends record separator '|'.
        Escapes any occurrences of '|'
        in text.
        
        :param txt: text to log
        :type txt: string
        '''
        UxRecorder.logger.error('(error)|%s' % UxRecorder.csvSeparatorRe.sub("\|", txt))

    def logWarn(self, txt):
        '''
        Convenience method for logging.
        Adds "warn" to standard logging line header. 
        Prepends record separator '|'.
        Escapes any occurrences of '|'
        in text.
        
        :param txt: text to log
        :type txt: string
        '''
        UxRecorder.logger.warn('(warn)|%s' % UxRecorder.csvSeparatorRe.sub("\|", txt))
    
    #---------------------------
    # set_default_headers 
    #----------------*/

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        
    #---------------------------
    # options 
    #----------------*/
        
    def options(self):
        # no body
        self.set_status(204)
        self.finish()

    # -------------------------------  Startup ------------------        
    
def make_app():
    return tornado.web.Application([
        (r"/", UxRecorder),
    ])

if __name__ == "__main__":
    # File holding acceptable login names, one per line:
    logPath = os.path.join(os.getenv("HOME"), ".ssh", "stats60Statlets.log")
    uidPath = os.path.join(os.getenv("HOME"), ".ssh", "stats60Uids.txt")
    app = make_app()
    UxRecorder.initializeOnce(loggingLevel=logging.INFO, logFile=logPath, uidFile=uidPath)
    app.listen(8889)
    tornado.ioloop.IOLoop.current().start()
