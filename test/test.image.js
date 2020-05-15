const assert    = require('assert');
const helper    = require('../lib/helper');
const carbone   = require('../lib/index');
const path      = require('path');
const xmlFormat = require('xml-beautifier');
const fs        = require('fs');
const image     = require('../lib/image');
const nock      = require('nock');


describe.only('Image processing in ODT, DOCX, ODS, ODP, XSLX, ...', function () {
  const _imageFRBase64jpg            = fs.readFileSync(path.join(__dirname, 'datasets', 'image', 'imageFR_base64_html_jpg.txt'  ), 'utf8');
  const _imageFRBase64jpgWithoutType = fs.readFileSync(path.join(__dirname, 'datasets', 'image', 'imageFR_base64_jpg.txt'       ), 'utf8');
  const _imageDEBase64jpg            = fs.readFileSync(path.join(__dirname, 'datasets', 'image', 'imageDE_base64_html_jpg.txt'  ), 'utf8');
  const _imageITBase64png            = fs.readFileSync(path.join(__dirname, 'datasets', 'image', 'imageIT_base64_html_png.txt'  ), 'utf8');
  const _imageLogoBase64jpg          = fs.readFileSync(path.join(__dirname, 'datasets', 'image', 'imageLogo_base64_html_jpg.txt'), 'utf8');

  describe('OpenDocument ODT', function () {
    it('should do nothing if there is no marker inside XML', function (done) {
      const _testedReport = 'odt-simple-without-marker';
      carbone.render(openTemplate(_testedReport), {}, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });
    it('should replace image (base64 jpg)', function (done) {
      const _testedReport = 'odt-simple';
      const _data = {
        image : _imageFRBase64jpg
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });
    it('should replace image (base64 with old method type) DEPRECATED', function (done) {
      const _testedReport = 'odt-simple';
      const _data = {
        image        : '$base64image',
        $base64image : {
          data      : _imageFRBase64jpgWithoutType,
          extension : 'jpeg'
        }
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });
    it('should replace 3 images with 3 imageFit `contain` and `fill` and contain by default', function (done) {
      const _testedReport = 'odt-image-size';
      const _data = {
        logo : _imageLogoBase64jpg
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });
    it('should replace image with loops (base64 jpg)\
      should accept PNG image even if the template image is a JPEG\
      should accept image in header with conditions i=0\
      should not save the image twice if it used twice in the document', function (done) {
      const _testedReport = 'odt-loop';
      const _data = {
        company : 'ideolys',
        logos   : [
          { image : _imageLogoBase64jpg },
          { image : _imageFRBase64jpg }
        ],
        cars : [{
          name      : 'tesla',
          countries : [
            { name : 'de', image : _imageDEBase64jpg },
            { name : 'fr', image : _imageFRBase64jpg },
            { name : 'it', image : _imageITBase64png }
          ]
        },
        {
          name      : 'toyota',
          countries : [
            { name : 'fr', image : _imageFRBase64jpg },
            { name : 'de', image : _imageDEBase64jpg }
          ]
        }]
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });

    describe('ODT preprocess XML', function () {
      it('should replace the main document tag attributes with markers and formaters (ODT/ODS XML from LO) (unit: CM)', function (done) {
        let template = {
          files : [
            {
              name : 'content.xml',
              data : '<draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="as-char" svg:width="6.92cm" svg:height="4.616cm" draw:z-index="0"><draw:image xlink:href="Pictures/10000000000003E80000029B8FE7CEEBB673664E.jpg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" loext:mime-type="image/jpeg"/><svg:desc>{d.image}</svg:desc></draw:frame>'
            }
          ]
        };
        let expectedXML = '<draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="as-char" svg:width="{d.image:scaleImageLo(width, 6.92, cm)}" svg:height="{d.image:scaleImageLo(height, 4.616, cm)}" draw:z-index="0"><draw:image xlink:href="{d.image:generateOpenDocumentImageHref()}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" loext:mime-type="{d.image:generateOpenDocumentImageMimeType()}"/><svg:desc></svg:desc></draw:frame>';
        image.preProcessLo(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });

      it('should replace the main document tag attributes with markers and formaters (ODT XML from WORD) (unit: INCH)', function (done) {
        let template = {
          files : [
            {
              name : 'content.xml',
              data : '<draw:frame draw:style-name="a0" draw:name="Image 1" text:anchor-type="as-char" svg:x="0in" svg:y="0in" svg:width="0.3375in" svg:height="0.20903in" style:rel-width="scale" style:rel-height="scale"><draw:image xlink:href="media/image1.jpeg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/><svg:title/><svg:desc>{d.image}</svg:desc></draw:frame>'
            }
          ]
        };
        let expectedXML = '<draw:frame draw:style-name="a0" draw:name="Image 1" text:anchor-type="as-char" svg:x="0in" svg:y="0in" svg:width="{d.image:scaleImageLo(width, 0.3375, in)}" svg:height="{d.image:scaleImageLo(height, 0.20903, in)}" style:rel-width="scale" style:rel-height="scale"><draw:image xlink:href="{d.image:generateOpenDocumentImageHref()}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/><svg:title/><svg:desc></svg:desc></draw:frame>';
        image.preProcessLo(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });

      it('should replace the main document tag attributes with markers and formaters (ODT/ODS XML from LO) (unit: CM) (imageFit contain)', function (done) {
        let template = {
          files : [
            {
              name : 'content.xml',
              data : '<draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="as-char" svg:width="6.92cm" svg:height="4.616cm" draw:z-index="0"><draw:image xlink:href="Pictures/10000000000003E80000029B8FE7CEEBB673664E.jpg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" loext:mime-type="image/jpeg"/><svg:desc>{d.image:imageFit(contain)}</svg:desc></draw:frame>'
            }
          ]
        };
        let expectedXML = '<draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="as-char" svg:width="{d.image:scaleImageLo(width, 6.92, cm)}" svg:height="{d.image:scaleImageLo(height, 4.616, cm)}" draw:z-index="0"><draw:image xlink:href="{d.image:generateOpenDocumentImageHref()}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" loext:mime-type="{d.image:generateOpenDocumentImageMimeType()}"/><svg:desc></svg:desc></draw:frame>';
        image.preProcessLo(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });
      it('should replace the main document tag attributes with markers and formaters (ODT/ODS XML from LO) (unit: CM) (imageFit fill)', function (done) {
        let template = {
          files : [
            {
              name : 'content.xml',
              data : '<draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="as-char" svg:width="6.92cm" svg:height="4.616cm" draw:z-index="0"><draw:image xlink:href="Pictures/10000000000003E80000029B8FE7CEEBB673664E.jpg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" loext:mime-type="image/jpeg"/><svg:desc>{d.image:imageFit(contain)}</svg:desc></draw:frame>'
            }
          ]
        };
        let expectedXML = '<draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="as-char" svg:width="{d.image:scaleImageLo(width, 6.92, cm)}" svg:height="{d.image:scaleImageLo(height, 4.616, cm)}" draw:z-index="0"><draw:image xlink:href="{d.image:generateOpenDocumentImageHref()}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" loext:mime-type="{d.image:generateOpenDocumentImageMimeType()}"/><svg:desc></svg:desc></draw:frame>';
        image.preProcessLo(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });
    });
  });

  describe('OpenDocument ODS', function () {
    it('should replace one image (base64 jpg)', function (done) {
      const _testedReport = 'ods-simple';
      const _data = {
        image : _imageFRBase64jpg
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });

    it('should replace multiple images (base64 jpg png)', function (done) {
      const _testedReport = 'ods-complex';
      const _data = {
        imageFR      : _imageFRBase64jpg,
        imageFRold   : '$base64image',
        $base64image : {
          data      : _imageFRBase64jpgWithoutType,
          extension : 'jpeg'
        },
        imageDE   : _imageDEBase64jpg,
        imageIT   : _imageITBase64png,
        imageLogo : _imageLogoBase64jpg,
        text      : "0+rR_r+f|U*aG!^[;sEAN[y|x'TCe}|?20D_E,[Z",
        text2     : 'K$-QXILVAB#j:XnR$*m"$9Rk76B@ARy2_qBdp2Xu',
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });
  });

  describe('DOCX MS document', function () {
    it('should replace an image (Created from LO)(base64 jpg)', function (done) {
      const _testedReport = 'docx-simple';
      const _data = {
        image : _imageDEBase64jpg
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });

    it('should replace an image (Created from MS Word Windows)(base64 jpg)', function (done) {
      const _testedReport = 'docx-windows-word';
      const _data = {
        image : _imageDEBase64jpg
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });

    it('should replace an image (Created from MS Word Online)(base64 jpg)', function (done) {
      const _testedReport = 'docx-word-online';
      const _data = {
        tests : {
          child : {
            child : {
              imageDE : _imageDEBase64jpg
            }
          }
        }
      };
      carbone.render(openTemplate(_testedReport, true), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport, true);
        done();
      });
    });

    it('should replace 4 images to invalid image', function (done) {
      const _testedReport = 'docx-errors';
      const _data = {
        tests : {
          imageError : 'This is some random text',
        },
        error2 : 'https://media.giphy.com/media/yXBqba0Zx8',
        error3 : 'data:image/jpeg;base64,',
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });

    it('should replace multiple images with a complexe data object (child of child) (base64 jpg)', function (done) {
      const _testedReport = 'docx-complex';
      const _data = {
        tests : {
          image : _imageFRBase64jpg,
          child : {
            imageIT : _imageITBase64png,
            child   : {
              imageDE : _imageDEBase64jpg,
            }
          },
          imageLogo  : _imageLogoBase64jpg,
          imageError : 'This is some random text',
        },
        imageFRold   : '$base64image',
        $base64image : {
          data      : _imageFRBase64jpgWithoutType,
          extension : 'jpg'
        }
      };
      carbone.render(openTemplate(_testedReport), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport);
        done();
      });
    });

    describe('DOCX preprocess XML', function () {
      it('should replace the main document tag attributes with markers and formaters (common DOCX xml from LO or MS)', function (done) {
        let template = {
          files : [
            {
              name : 'word/document.xml',
              data : '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="952500" cy="590550"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Image1" descr="{d.image}"></wp:docPr><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="Image1" descr="{d.image}"></pic:cNvPr><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="590550"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>'
            }
          ]
        };
        let expectedXML = '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{d.image:scaleImageDocxWidth(952500)}" cy="{d.image:scaleImageDocxHeight(590550)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{d.image:generateImageDocxId()}" name="Image1" descr=""></wp:docPr><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="{d.image:generateImageDocxId()}" name="Image1" descr=""></pic:cNvPr><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="{d.image:generateImageDocxReference()}"></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="{d.image:scaleImageDocxWidth(952500)}" cy="{d.image:scaleImageDocxHeight(590550)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
        image.preProcessDocx(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });

      it('should replace the main document tag attributes with markers and formaters (DOCX xml from MS Word Online)', function (done) {
        let template = {
          files : [
            {
              // the main document name is different, the file _rels/.rels is used to find the main document
              name : 'word/documentName1234.xml',
              data : '<w:drawing><wp:inline wp14:editId="5C7CCEE1" wp14:anchorId="63CC715F"><wp:extent cx="2335161" cy="1447800" /><wp:effectExtent l="0" t="0" r="0" b="0" /><wp:docPr id="1231221318" name="" title="{d.tests.child.child.imageDE}" /><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1" /></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="" /><pic:cNvPicPr /></pic:nvPicPr><pic:blipFill><a:blip r:embed="R1e71cf0a0beb4eb3"><a:extLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a14:useLocalDpi val="0" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" /></a:ext></a:extLst></a:blip><a:stretch><a:fillRect /></a:stretch></pic:blipFill><pic:spPr><a:xfrm rot="0" flipH="0" flipV="0"><a:off x="0" y="0" /><a:ext cx="2335161" cy="1447800" /></a:xfrm><a:prstGeom prst="rect"><a:avLst /></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>'
            },
            {
              name : '_rels/.rels',
              data : '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/word/documentName1234.xml" Id="rId1" /></Relationships>'
            }
          ]
        };
        let expectedXML = '<w:drawing><wp:inline wp14:editId="5C7CCEE1" wp14:anchorId="63CC715F"><wp:extent cx="{d.tests.child.child.imageDE:scaleImageDocxWidth(2335161)}" cy="{d.tests.child.child.imageDE:scaleImageDocxHeight(1447800)}" /><wp:effectExtent l="0" t="0" r="0" b="0" /><wp:docPr id="{d.tests.child.child.imageDE:generateImageDocxId()}" name="" title="" /><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1" /></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="" /><pic:cNvPicPr /></pic:nvPicPr><pic:blipFill><a:blip r:embed="{d.tests.child.child.imageDE:generateImageDocxReference()}"><a:extLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a14:useLocalDpi val="0" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" /></a:ext></a:extLst></a:blip><a:stretch><a:fillRect /></a:stretch></pic:blipFill><pic:spPr><a:xfrm rot="0" flipH="0" flipV="0"><a:off x="0" y="0" /><a:ext cx="{d.tests.child.child.imageDE:scaleImageDocxWidth(2335161)}" cy="{d.tests.child.child.imageDE:scaleImageDocxHeight(1447800)}" /></a:xfrm><a:prstGeom prst="rect"><a:avLst /></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
        image.preProcessDocx(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });

      it('should replace the main document tag attributes with markers and formaters (common DOCX xml from LO or MS) - test imageFit formatter with the value contain', function (done) {
        let template = {
          files : [
            {
              name : 'word/document.xml',
              data : '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="952500" cy="590550"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Image1" descr="{d.image:imageFit(contain)}"></wp:docPr><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="Image1" descr="{d.image}"></pic:cNvPr><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="590550"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>'
            }
          ]
        };
        let expectedXML = '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{d.image:scaleImageDocxWidth(952500)}" cy="{d.image:scaleImageDocxHeight(590550)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{d.image:generateImageDocxId()}" name="Image1" descr=""></wp:docPr><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="{d.image:generateImageDocxId()}" name="Image1" descr=""></pic:cNvPr><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="{d.image:generateImageDocxReference()}"></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="{d.image:scaleImageDocxWidth(952500)}" cy="{d.image:scaleImageDocxHeight(590550)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
        image.preProcessDocx(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });

      it('should replace the main document tag attributes with markers and formaters (common DOCX xml from LO or MS) - test imageFit formatter with the value fill', function (done) {
        let template = {
          files : [
            {
              name : 'word/document.xml',
              data : '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="952500" cy="590550"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Image1" descr="{d.image:imageFit(fill)}"></wp:docPr><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="Image1" descr="{d.image}"></pic:cNvPr><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="590550"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>'
            }
          ]
        };
        let expectedXML = '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="952500" cy="590550"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{d.image:generateImageDocxId()}" name="Image1" descr=""></wp:docPr><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="{d.image:generateImageDocxId()}" name="Image1" descr=""></pic:cNvPr><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="{d.image:generateImageDocxReference()}"></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="590550"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
        image.preProcessDocx(template);
        helper.assert(template.files[0].data, expectedXML);
        done();
      });
    });
  });

  describe('DOCX ODT scaling', function () {
    it('_getImageSize: should return nothing because of an empty Buffer', function (done) {
      let _imageInfo = {
        unit           : 'emu',
        data           : new Buffer.from(''),
        newImageWidth  : -1,
        newImageHeight : -1
      };
      image._getImageSize(_imageInfo);
      helper.assert(_imageInfo.newImageWidth, -1);
      helper.assert(_imageInfo.newImageHeight, -1);
      done();
    });

    it('_getImageSize: should return the EMU size of a JPEG base64 image', function (done) {
      image.parseBase64Picture(_imageFRBase64jpg, function (err, imageData) {
        let _imageInfo = {
          unit           : 'emu',
          data           : imageData.data,
          newImageWidth  : -1,
          newImageHeight : -1
        };
        image._getImageSize(_imageInfo, _imageInfo.unit);
        helper.assert(_imageInfo.newImageWidth, 952500);
        helper.assert(_imageInfo.newImageHeight, 590550);
        done();
      });
    });


    it('_getImageSize: should return the EMU size of a PNG base64 image', function (done) {
      image.parseBase64Picture(_imageITBase64png, function (err, imageData) {
        let _imageInfo = {
          unit           : 'emu',
          data           : imageData.data,
          newImageWidth  : -1,
          newImageHeight : -1
        };
        image._getImageSize(_imageInfo, _imageInfo.unit);
        helper.assert(_imageInfo.newImageWidth, 2857500);
        helper.assert(_imageInfo.newImageHeight, 1905000);
        done();
      });
    });

    it('_getImageSize: should return the CM size of a JPEG base64 image', function (done) {
      image.parseBase64Picture(_imageFRBase64jpg, function (err, imageData) {
        let _imageInfo = {
          unit           : 'cm',
          data           : imageData.data,
          newImageWidth  : -1,
          newImageHeight : -1
        };
        image._getImageSize(_imageInfo, _imageInfo.unit);
        helper.assert(_imageInfo.newImageWidth, 2.65);
        helper.assert(_imageInfo.newImageHeight, 1.643);
        done();
      });
    });


    it('_getImageSize: should return the CM size of a PNG base64 image', function (done) {
      image.parseBase64Picture(_imageITBase64png, function (err, imageData) {
        let _imageInfo = {
          unit           : 'cm',
          data           : imageData.data,
          newImageWidth  : -1,
          newImageHeight : -1
        };
        image._getImageSize(_imageInfo, _imageInfo.unit);
        helper.assert(_imageInfo.newImageWidth, 7.95);
        helper.assert(_imageInfo.newImageHeight, 5.3);
        done();
      });
    });

    it('_getImageSize: should return the INCH size of a JPEG base64 image', function (done) {
      image.parseBase64Picture(_imageFRBase64jpg, function (err, imageData) {
        let _imageInfo = {
          unit           : 'in',
          data           : imageData.data,
          newImageWidth  : -1,
          newImageHeight : -1
        };
        image._getImageSize(_imageInfo, _imageInfo.unit);
        helper.assert(_imageInfo.newImageWidth, 1.0416666666666667);
        helper.assert(_imageInfo.newImageHeight, 0.6458333333333334);
        done();
      });
    });

    it('_getImageSize: should return the INCH size of a PNG base64 image', function (done) {
      image.parseBase64Picture(_imageITBase64png, function (err, imageData) {
        let _imageInfo = {
          unit           : 'in',
          data           : imageData.data,
          newImageWidth  : -1,
          newImageHeight : -1
        };
        image._getImageSize(_imageInfo, _imageInfo.unit);
        helper.assert(_imageInfo.newImageWidth, 3.125);
        helper.assert(_imageInfo.newImageHeight, 2.0833333333333335);
        done();
      });
    });

    it("_computeImageSize 1: should compute the imageFit size as 'contain'", function (done) {
      let _imageInfo = {
        unit           : 'emu',
        newImageWidth  : 220,
        newImageHeight : 100,
        imageWidth     : 100,
        imageHeight    : 80
      };
      image._computeImageSize(_imageInfo);
      helper.assert(_imageInfo.imageWidth, 100);
      helper.assert(_imageInfo.imageHeight, 46);
      done();
    });

    it("_computeImageSize 2: should compute the imageFit size as 'contain'", function (done) {
      let _imageInfo = {
        unit           : 'emu',
        newImageWidth  : 2857500,
        newImageHeight : 1905000,
        imageWidth     : 952500,
        imageHeight    : 590550
      };
      image._computeImageSize(_imageInfo);
      helper.assert(_imageInfo.imageWidth, 952500);
      helper.assert(_imageInfo.imageHeight, 635000);
      done();
    });
  });

  describe('XLSX documents', function () {
    it('should replace one image (Created from LO)(base64 jpg)', function (done) {
      const _testedReport = 'xlsx-simple';
      const _data = {
        tests : {
          image : _imageFRBase64jpg
        }
      };
      carbone.render(openTemplate(_testedReport, true), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport, true);
        done();
      });
    });

    it('should replace one image on multiple sheets (Created from LO)(base64 jpg)', function (done) {
      const _testedReport = 'xlsx-image-shared';
      const _data = {
        tests : {
          image : _imageFRBase64jpg
        }
      };
      carbone.render(openTemplate(_testedReport, true), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport, true);
        done();
      });
    });

    it('should replace multiple images on multiple sheets (Created from LO)(base64 jpg)', function (done) {
      const _testedReport = 'xlsx-multi-sheets';
      const _data = {
        tests : {
          image : _imageFRBase64jpg,
          child : {
            imageIT : _imageITBase64png,
            child   : {
              imageDE : _imageDEBase64jpg,
            }
          },
          imageLogo  : _imageLogoBase64jpg,
          imageError : 'Thisissomerandomtext',
        },
        imageFRold   : '$base64image',
        $base64image : {
          data      : _imageFRBase64jpgWithoutType,
          extension : 'jpg'
        },
        imageError : 'This is some random text',
        error3     : 'data:image/jpeg;base64,',
      };
      carbone.render(openTemplate(_testedReport, true), _data, (err, res) => {
        helper.assert(err+'', 'null');
        assertFullReport(res, _testedReport, true);
        done();
      });
    });
  });

  describe('parseBase64Picture - Parse a base64 data-uri into an object descriptor', function () {
    // png, jpeg, GIF, BMP, non picture format (html), strange base64, différent mimetypes
    it('should parse base64 PNG (1)', function () {
      const _base64Picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAJ7SURBVDjLjZNPSFRRFMZ/9/2Z90anRlKzMS1UjFyoWS3U2oVQ0KIWrXJRFC7KTdRCqUWQkBt34aKN1a5FEUkRLbKFiBAoVi4kUQIbtfwz0zjjezPv3ttCwyYr+jibs7g/vu+cc8XDwbE+pcT5TFa5fsB26fzWtsC1Gbh85vA1AEtp0X76WGWp67pCCJN/yVMggxxP30xfADYAGV85juOKR29X8VgmJaaoKvtK2E4SaMXK9zCT01EKdB0Wxdw4V4VUQvyEWtkADMPEEJA1Fqgq+YoT+kzSTxHIAMtxqK6MMTtTSFGoBKXyXVkACjAMga+/EbJXSawn8aVHNggIdBrHcUj7YYrDBhqdN5gtgBDoQOHLHF7gs57zyaoAqQCRQyuJZQi0zp+qAaD1BsCllFS6EI2NryR+IBEiRDoVIRIqxzQN0GJ7BK03IkTMvXxZWCTqzlNQaOCIgLWVAhYXYsSi1ViG2LYZS/8KsHdTHm5ibnyIokgcISW2V8q+mnYibgyp1O9nseVgarkDqRRSKQ7432ip3I8CZuYXebXWjZkoxFQRbj/wyHjezhfd87de3p3osbTWCODkxmEBYNYnyKSXceffU9LaQcP0GEuZKY7UHaViVy1Dk8/E6Mf4nebO8qLNVPnGZLgIv6SGZP1ZtGnzbvIthw42Ig1JY6wNKXI017cCXLVcWyRRuWhjWTMIsYnSPwuApeQitohwqu4SANdP3GfwQz/w3LVClnj8ZGimJSt1vdZ//gOJVCI6GR9hIj5MV9sAva8v4poOgCf03179oubO8p6KqujN1obj1O5p4tPCOCPvh5mbTfb9F2AT0gtcAXYAKaB/9F686wcCdBKN9UyNSAAAAABJRU5ErkJggg==';
      const _expectedResp = {
        data      : new Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAJ7SURBVDjLjZNPSFRRFMZ/9/2Z90anRlKzMS1UjFyoWS3U2oVQ0KIWrXJRFC7KTdRCqUWQkBt34aKN1a5FEUkRLbKFiBAoVi4kUQIbtfwz0zjjezPv3ttCwyYr+jibs7g/vu+cc8XDwbE+pcT5TFa5fsB26fzWtsC1Gbh85vA1AEtp0X76WGWp67pCCJN/yVMggxxP30xfADYAGV85juOKR29X8VgmJaaoKvtK2E4SaMXK9zCT01EKdB0Wxdw4V4VUQvyEWtkADMPEEJA1Fqgq+YoT+kzSTxHIAMtxqK6MMTtTSFGoBKXyXVkACjAMga+/EbJXSawn8aVHNggIdBrHcUj7YYrDBhqdN5gtgBDoQOHLHF7gs57zyaoAqQCRQyuJZQi0zp+qAaD1BsCllFS6EI2NryR+IBEiRDoVIRIqxzQN0GJ7BK03IkTMvXxZWCTqzlNQaOCIgLWVAhYXYsSi1ViG2LYZS/8KsHdTHm5ibnyIokgcISW2V8q+mnYibgyp1O9nseVgarkDqRRSKQ7432ip3I8CZuYXebXWjZkoxFQRbj/wyHjezhfd87de3p3osbTWCODkxmEBYNYnyKSXceffU9LaQcP0GEuZKY7UHaViVy1Dk8/E6Mf4nebO8qLNVPnGZLgIv6SGZP1ZtGnzbvIthw42Ig1JY6wNKXI017cCXLVcWyRRuWhjWTMIsYnSPwuApeQitohwqu4SANdP3GfwQz/w3LVClnj8ZGimJSt1vdZ//gOJVCI6GR9hIj5MV9sAva8v4poOgCf03179oubO8p6KqujN1obj1O5p4tPCOCPvh5mbTfb9F2AT0gtcAXYAKaB/9F686wcCdBKN9UyNSAAAAABJRU5ErkJggg==', 'base64'),
        mimetype  : 'image/png',
        extension : 'png',
      };
      image.parseBase64Picture(_base64Picture, function (err, imageDescriptor) {
        assert(err+'', 'null');
        helper.assert(imageDescriptor, _expectedResp);
      });
    });
    it('should parse base64 PNG (2)', function () {
      const _base64Picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
      const _expectedResp ={
        data      : new Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==', 'base64'),
        mimetype  : 'image/png',
        extension : 'png',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 BMP', function () {
      const _base64Picture = 'data:image/x-ms-bmp;base64,Qk2aAAAAAAAAADYAAAAoAAAABQAAAPv///8BACAAAAAAAAAAAAATCwAAEwsAAAAAAAAAAAAASTny/0Rp9f9Vq+H/nruq/66zqf9IefL/Sz3z/0R18P+OssH/t6qo/0KJ9P8/ePD/QgD5/z6l4/+otKj/Zara/4+6uP9EpuH/n6S8/8pxpP9kv8j/lrir/5DBr//FlKX/xUSr/w==';
      const _expectedResp ={
        data      : new Buffer.from('Qk2aAAAAAAAAADYAAAAoAAAABQAAAPv///8BACAAAAAAAAAAAAATCwAAEwsAAAAAAAAAAAAASTny/0Rp9f9Vq+H/nruq/66zqf9IefL/Sz3z/0R18P+OssH/t6qo/0KJ9P8/ePD/QgD5/z6l4/+otKj/Zara/4+6uP9EpuH/n6S8/8pxpP9kv8j/lrir/5DBr//FlKX/xUSr/w==', 'base64'),
        mimetype  : 'image/x-ms-bmp',
        extension : 'bmp',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 JPEG', function () {
      const _base64Picture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAA2gAwAEAAAAAQAAAAwAAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/CABEIAAwADQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAADAgQBBQAGBwgJCgv/xADDEAABAwMCBAMEBgQHBgQIBnMBAgADEQQSIQUxEyIQBkFRMhRhcSMHgSCRQhWhUjOxJGIwFsFy0UOSNIII4VNAJWMXNfCTc6JQRLKD8SZUNmSUdMJg0oSjGHDiJ0U3ZbNVdaSVw4Xy00Z2gONHVma0CQoZGigpKjg5OkhJSldYWVpnaGlqd3h5eoaHiImKkJaXmJmaoKWmp6ipqrC1tre4ubrAxMXGx8jJytDU1dbX2Nna4OTl5ufo6erz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAECAAMEBQYHCAkKC//EAMMRAAICAQMDAwIDBQIFAgQEhwEAAhEDEBIhBCAxQRMFMCIyURRABjMjYUIVcVI0gVAkkaFDsRYHYjVT8NElYMFE4XLxF4JjNnAmRVSSJ6LSCAkKGBkaKCkqNzg5OkZHSElKVVZXWFlaZGVmZ2hpanN0dXZ3eHl6gIOEhYaHiImKkJOUlZaXmJmaoKOkpaanqKmqsLKztLW2t7i5usDCw8TFxsfIycrQ09TV1tfY2drg4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwAEBAQEBAQEBAQEBgYFBgYIBwcHBwgMCQkJCQkMEwwODAwODBMRFBAPEBQRHhcVFRceIh0bHSIqJSUqNDI0RERc/9sAQwEEBAQEBAQEBAQEBgYFBgYIBwcHBwgMCQkJCQkMEwwODAwODBMRFBAPEBQRHhcVFRceIh0bHSIqJSUqNDI0RERc/9oADAMBAAIRAxEAAAE3c+S9dxdX/9oACAEBAAEFAtwM19vOzWl3bQbnCmC/2OGKVP8A/9oACAEDEQE/AZj+WOeKD//aAAgBAhEBPwGErzHj83//2gAIAQEABj8CltFL6Uq5cYyxA6a1ckS7hPtV06hr+FHcxpKiErGqjU8PV3CpEZKqnUqL/8QAMxABAAMAAgICAgIDAQEAAAILAREAITFBUWFxgZGhscHw0RDh8SAwQFBgcICQoLDA0OD/2gAIAQEAAT8h50BElHmnd3t4vSSY4gcAnRYhqK9wkrWOnm5S40Y3w3//2gAMAwEAAhEDEQAAEAv/xAAzEQEBAQADAAECBQUBAQABAQkBABEhMRBBUWEgcfCRgaGx0cHh8TBAUGBwgJCgsMDQ4P/aAAgBAxEBPxDPojhz5+vd/9oACAECEQE/EGxDV7/2v//aAAgBAQABPxBQcvDNsAybAgxFl2oxrkkTck4Vkr6+Wl26HFFgErYf5HmAiYmeYm//2Q==';
      const _expectedResp ={
        data      : new Buffer.from('/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAA2gAwAEAAAAAQAAAAwAAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/CABEIAAwADQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAADAgQBBQAGBwgJCgv/xADDEAABAwMCBAMEBgQHBgQIBnMBAgADEQQSIQUxEyIQBkFRMhRhcSMHgSCRQhWhUjOxJGIwFsFy0UOSNIII4VNAJWMXNfCTc6JQRLKD8SZUNmSUdMJg0oSjGHDiJ0U3ZbNVdaSVw4Xy00Z2gONHVma0CQoZGigpKjg5OkhJSldYWVpnaGlqd3h5eoaHiImKkJaXmJmaoKWmp6ipqrC1tre4ubrAxMXGx8jJytDU1dbX2Nna4OTl5ufo6erz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAECAAMEBQYHCAkKC//EAMMRAAICAQMDAwIDBQIFAgQEhwEAAhEDEBIhBCAxQRMFMCIyURRABjMjYUIVcVI0gVAkkaFDsRYHYjVT8NElYMFE4XLxF4JjNnAmRVSSJ6LSCAkKGBkaKCkqNzg5OkZHSElKVVZXWFlaZGVmZ2hpanN0dXZ3eHl6gIOEhYaHiImKkJOUlZaXmJmaoKOkpaanqKmqsLKztLW2t7i5usDCw8TFxsfIycrQ09TV1tfY2drg4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwAEBAQEBAQEBAQEBgYFBgYIBwcHBwgMCQkJCQkMEwwODAwODBMRFBAPEBQRHhcVFRceIh0bHSIqJSUqNDI0RERc/9sAQwEEBAQEBAQEBAQEBgYFBgYIBwcHBwgMCQkJCQkMEwwODAwODBMRFBAPEBQRHhcVFRceIh0bHSIqJSUqNDI0RERc/9oADAMBAAIRAxEAAAE3c+S9dxdX/9oACAEBAAEFAtwM19vOzWl3bQbnCmC/2OGKVP8A/9oACAEDEQE/AZj+WOeKD//aAAgBAhEBPwGErzHj83//2gAIAQEABj8CltFL6Uq5cYyxA6a1ckS7hPtV06hr+FHcxpKiErGqjU8PV3CpEZKqnUqL/8QAMxABAAMAAgICAgIDAQEAAAILAREAITFBUWFxgZGhscHw0RDh8SAwQFBgcICQoLDA0OD/2gAIAQEAAT8h50BElHmnd3t4vSSY4gcAnRYhqK9wkrWOnm5S40Y3w3//2gAMAwEAAhEDEQAAEAv/xAAzEQEBAQADAAECBQUBAQABAQkBABEhMRBBUWEgcfCRgaGx0cHh8TBAUGBwgJCgsMDQ4P/aAAgBAxEBPxDPojhz5+vd/9oACAECEQE/EGxDV7/2v//aAAgBAQABPxBQcvDNsAybAgxFl2oxrkkTck4Vkr6+Wl26HFFgErYf5HmAiYmeYm//2Q==', 'base64'),
        mimetype  : 'image/jpeg',
        extension : 'jpeg',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 JPG', function () {
      const _base64Picture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/+EAjEV4aWYAAE1NACoAAAAIAAUBEgADAAAAAQABAAABGgAFAAAAAQAAAEoBGwAFAAAAAQAAAFIBKAADAAAAAQACAACHaQAEAAAAAQAAAFoAAAAAAAAASAAAAAEAAABIAAAAAQADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAANoAMABAAAAAEAAAAMAAAAAP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/bAEMBBQUFBwYHDggIDh4UERQeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHv/AABEIAAwADQMBIgACEQEDEQH/xAAWAAEBAQAAAAAAAAAAAAAAAAAHBAj/xAAkEAACAgEDBAMBAQAAAAAAAAABAgMEBQYREgAHCBQTISIxof/EABQBAQAAAAAAAAAAAAAAAAAAAAX/xAAaEQABBQEAAAAAAAAAAAAAAAADAAECESEj/9oADAMBAAIRAxEAPwCnutPmNc+Qt/Sdm4fXr2fRx8T2fghib1kkD/YILbuxOw5MPyOPS1496Q1ZpnS93FX9QVSfZEyLA/sxoGUDiqsqmP7Xcj+EtuOs497MLWwPc3O4+tPbsxwWYWR7c5llPJEI5Of0xXcAMSW2Ubk9JHjXhMRlaedsZSibk6zRJ8r2pgxUc9h+XA/zosU7O9JAkebbmL//2Q==';
      const _expectedResp ={
        data      : new Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/+EAjEV4aWYAAE1NACoAAAAIAAUBEgADAAAAAQABAAABGgAFAAAAAQAAAEoBGwAFAAAAAQAAAFIBKAADAAAAAQACAACHaQAEAAAAAQAAAFoAAAAAAAAASAAAAAEAAABIAAAAAQADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAANoAMABAAAAAEAAAAMAAAAAP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/bAEMBBQUFBwYHDggIDh4UERQeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHv/AABEIAAwADQMBIgACEQEDEQH/xAAWAAEBAQAAAAAAAAAAAAAAAAAHBAj/xAAkEAACAgEDBAMBAQAAAAAAAAABAgMEBQYREgAHCBQTISIxof/EABQBAQAAAAAAAAAAAAAAAAAAAAX/xAAaEQABBQEAAAAAAAAAAAAAAAADAAECESEj/9oADAMBAAIRAxEAPwCnutPmNc+Qt/Sdm4fXr2fRx8T2fghib1kkD/YILbuxOw5MPyOPS1496Q1ZpnS93FX9QVSfZEyLA/sxoGUDiqsqmP7Xcj+EtuOs497MLWwPc3O4+tPbsxwWYWR7c5llPJEI5Of0xXcAMSW2Ubk9JHjXhMRlaedsZSibk6zRJ8r2pgxUc9h+XA/zosU7O9JAkebbmL//2Q==', 'base64'),
        mimetype  : 'image/jpeg',
        extension : 'jpeg',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 JPEG (containing a SVG)', function () {
      const _base64Picture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDADIiJSwlHzIsKSw4NTI7S31RS0VFS5ltc1p9tZ++u7Kfr6zI4f/zyNT/16yv+v/9////////wfD/////////////2wBDATU4OEtCS5NRUZP/zq/O////////////////////////////////////////////////////////////////////wAARCAAYAEADAREAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAQMAAgQF/8QAJRABAAIBBAEEAgMAAAAAAAAAAQIRAAMSITEEEyJBgTORUWFx/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AOgM52xQDrjvAV5Xv0vfKUALlTQfeBm0HThMNHXkL0Lw/swN5qgA8yT4MCS1OEOJV8mBz9Z05yfW8iSx7p4j+jA1aD6Wj7ZMzstsfvAas4UyRHvjrAkC9KhpLMClQntlqFc2X1gUj4viwVObKrddH9YDoHvuujAEuNV+bLwFS8XxdSr+Cq3Vf+4F5RgQl6ZR2p1eAzU/HX80YBYyJLCuexwJCO2O1bwCRidAfWBSctswbI12GAJT3yiwFR7+MBjGK2g/WAJR3FdF84E2rK5VR0YH/9k=';
      const _expectedResp ={
        data      : new Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDADIiJSwlHzIsKSw4NTI7S31RS0VFS5ltc1p9tZ++u7Kfr6zI4f/zyNT/16yv+v/9////////wfD/////////////2wBDATU4OEtCS5NRUZP/zq/O////////////////////////////////////////////////////////////////////wAARCAAYAEADAREAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAQMAAgQF/8QAJRABAAIBBAEEAgMAAAAAAAAAAQIRAAMSITEEEyJBgTORUWFx/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AOgM52xQDrjvAV5Xv0vfKUALlTQfeBm0HThMNHXkL0Lw/swN5qgA8yT4MCS1OEOJV8mBz9Z05yfW8iSx7p4j+jA1aD6Wj7ZMzstsfvAas4UyRHvjrAkC9KhpLMClQntlqFc2X1gUj4viwVObKrddH9YDoHvuujAEuNV+bLwFS8XxdSr+Cq3Vf+4F5RgQl6ZR2p1eAzU/HX80YBYyJLCuexwJCO2O1bwCRidAfWBSctswbI12GAJT3yiwFR7+MBjGK2g/WAJR3FdF84E2rK5VR0YH/9k=', 'base64'),
        mimetype  : 'image/jpeg',
        extension : 'jpeg',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 GIF', function () {
      const _base64Picture = 'data:image/gif;base64,R0lGODlhDwAPAPEAAPjxpLFyTee6bQAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqct9AiNUIkiZ6o3KbtF52pQEYhRk46WeHAK5ZHekDWjgjK4bBQAh+QQIBgD/ACwAAAAADwAPAAACJISPqcvtLIKYVChZa8J5XspdHJhMo2cdZuchEausJKQ6KXAbBQAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqcvtLaKMKoQ508UyiY15n7RdhwBYHIAa6Bi2J9gpcMZQLnQmBQAh+QQIBgD/ACwAAAAADwAPAAACJoSPqcvtLqJcIsir7MVI73hInmaFQOBhAlJ9VAoq7cZUZEmF61EAACH5BAgGAP8ALAAAAAAPAA8AAAIphI+py+0uYmQi2BuEsrJrlHnSIYWi9nGRaXyA2i2VKJujMndBMwO9UQAAIfkECAYA/wAsAAAAAA8ADwAAAiWEj6nL7Q+BmFQsEbLOKtSfeB9lUNkoWsY5pQo2qggMdvHVmnIBACH5BAgGAP8ALAAAAAAPAA8AAAImhI+py+0PgZhULBGyzirXGVgG+JWjVwYJilFdaK7llLRzTcHtUQAAIfkECAYA/wAsAAAAAA8ADwAAAiaEj6nL7Q+BCLQKNYXe4aK8hQkYagbXaRR5kOKYvnDpwVbGTGcNFAAh+QQIBgD/ACwAAAAADwAPAAACKoSPqcuNAiNUIkiZ6o3Zamh1W0B5oPZ82yEAKtayJleuzEACQb5MbmwoAAAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqZsSAqNysYr2LFQhW+55oBaMVpl05ORFaNrFD7MB9XIdOa0jBQAh+QQIBgD/ACwAAAAADwAPAAACKYSPecItCkRwTU1aUbgUcu5xTWCJDJlsGKqZkiJt8gRFLAs9hl73flIAACH5BAgGAP8ALAAAAAAPAA8AAAImhI95EuKvnoSoTXqCZXjp6yDcBQjiNwWKxrJK2bpvKc70Yuf6/hYAIfkECAYA/wAsAAAAAA8ADwAAAiaEj3nCLQpEcE1NWlG4FHLucU2QSGK2bBiZbK4LRWccLXR953pSAAAh+QQIBgD/ACwAAAAADwAPAAACJoSPqZvi75QIECZaX8N1ce5xT7CJGjKZ0RW0LsWQxroIBy0x+lIAADs=';
      const _expectedResp ={
        data      : new Buffer.from('R0lGODlhDwAPAPEAAPjxpLFyTee6bQAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqct9AiNUIkiZ6o3KbtF52pQEYhRk46WeHAK5ZHekDWjgjK4bBQAh+QQIBgD/ACwAAAAADwAPAAACJISPqcvtLIKYVChZa8J5XspdHJhMo2cdZuchEausJKQ6KXAbBQAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqcvtLaKMKoQ508UyiY15n7RdhwBYHIAa6Bi2J9gpcMZQLnQmBQAh+QQIBgD/ACwAAAAADwAPAAACJoSPqcvtLqJcIsir7MVI73hInmaFQOBhAlJ9VAoq7cZUZEmF61EAACH5BAgGAP8ALAAAAAAPAA8AAAIphI+py+0uYmQi2BuEsrJrlHnSIYWi9nGRaXyA2i2VKJujMndBMwO9UQAAIfkECAYA/wAsAAAAAA8ADwAAAiWEj6nL7Q+BmFQsEbLOKtSfeB9lUNkoWsY5pQo2qggMdvHVmnIBACH5BAgGAP8ALAAAAAAPAA8AAAImhI+py+0PgZhULBGyzirXGVgG+JWjVwYJilFdaK7llLRzTcHtUQAAIfkECAYA/wAsAAAAAA8ADwAAAiaEj6nL7Q+BCLQKNYXe4aK8hQkYagbXaRR5kOKYvnDpwVbGTGcNFAAh+QQIBgD/ACwAAAAADwAPAAACKoSPqcuNAiNUIkiZ6o3Zamh1W0B5oPZ82yEAKtayJleuzEACQb5MbmwoAAAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqZsSAqNysYr2LFQhW+55oBaMVpl05ORFaNrFD7MB9XIdOa0jBQAh+QQIBgD/ACwAAAAADwAPAAACKYSPecItCkRwTU1aUbgUcu5xTWCJDJlsGKqZkiJt8gRFLAs9hl73flIAACH5BAgGAP8ALAAAAAAPAA8AAAImhI95EuKvnoSoTXqCZXjp6yDcBQjiNwWKxrJK2bpvKc70Yuf6/hYAIfkECAYA/wAsAAAAAA8ADwAAAiaEj3nCLQpEcE1NWlG4FHLucU2QSGK2bBiZbK4LRWccLXR953pSAAAh+QQIBgD/ACwAAAAADwAPAAACJoSPqZvi75QIECZaX8N1ce5xT7CJGjKZ0RW0LsWQxroIBy0x+lIAADs=', 'base64'),
        mimetype  : 'image/gif',
        extension : 'gif',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 SVG', function () {
      const _base64Picture = 'data:image/svg+xml;base64,PD94bWwgdmVyzeiBNMyw2djJoMThWNkgzeiIvPjwvZz4KPC9zdmc+Cgo=';
      const _expectedResp ={
        data      : new Buffer.from('PD94bWwgdmVyzeiBNMyw2djJoMThWNkgzeiIvPjwvZz4KPC9zdmc+Cgo=', 'base64'),
        mimetype  : 'image/svg+xml',
        extension : 'svg',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });
    it('should parse a base64 WEBP', function () {
      const _base64Picture = ' data:image/webp;base64,UklGRmABAABXRUJQVlA4WAoAAAAIAAAADAAACwAAVlA4ILAAAAAQAwCdASoNAAwAAQAcJQBOgMWQ7Aep3/gDZocmhiduB4AA/vm7/8vTphhRfc9vfQ+56+VZc0Wf6X19P8Tpt9/3Gwr/yv3q4o1kockBGd/UITeIK4uGx/kn7zYfrQx/JQhooEhSZ/H/hDqIhYXDwyHKv/H/3hHEl9XVsP8VAIfgdi5y/a/x6n8gUK8d2Kfabk97LnEH717Ts3Ef8pf+XcPeqnYTFTjy+Y/79m2LxEAAAEVYSUaKAAAARXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAA2gAwAEAAAAAQAAAAwAAAAA';
      const _expectedResp ={
        data      : new Buffer.from('UklGRmABAABXRUJQVlA4WAoAAAAIAAAADAAACwAAVlA4ILAAAAAQAwCdASoNAAwAAQAcJQBOgMWQ7Aep3/gDZocmhiduB4AA/vm7/8vTphhRfc9vfQ+56+VZc0Wf6X19P8Tpt9/3Gwr/yv3q4o1kockBGd/UITeIK4uGx/kn7zYfrQx/JQhooEhSZ/H/hDqIhYXDwyHKv/H/3hHEl9XVsP8VAIfgdi5y/a/x6n8gUK8d2Kfabk97LnEH717Ts3Ef8pf+XcPeqnYTFTjy+Y/79m2LxEAAAEVYSUaKAAAARXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAA2gAwAEAAAAAQAAAAwAAAAA', 'base64'),
        mimetype  : 'image/webp',
        extension : 'webp',
      };
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err+'', 'null');
        helper.assert(imgDescriptor, _expectedResp);
      });
    });

    it('[ERROR test] should return an empty descriptor with an error because they are not a data-uri', function (done) {
      const _base64Pictures = [
        'data:text/html;charset=utf-8,<!DOCTYPE%20html><html%20lang%3D"en"><head><title>Embedded%20Window<%2Ftitle><%2Fhead><body><h1>42<%2Fh1><%2Fbody><%2Fhtml>',
        'data:text/plain;charset=utf-8;base64,VGhpcyBpcyBhIHRlc3Q='
      ];
      _base64Pictures.forEach(img => {
        image.parseBase64Picture(img, function (err, imgDescriptor) {
          helper.assert(err, 'Error base64 picture: it is not a base64 picture.');
          helper.assert(imgDescriptor+'', 'undefined');
        });
      });
      done();
    });
    it('[ERROR test] should return an empty descriptor with an error because the data-uri are invalid', function (done) {
      const _base64Pictures = [
        'R0lGODlhDwAPAPEAAPjxpLFyTee6bQAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqct9AiNUIkiZ6o3KbtF52pQEYhRk46WeHAK5ZHekDWjgjK4bBQAh+QQIBgD/ACwAAAAADwAPAAACJISPqcvtLIKYVChZa8J5XspdHJhMo2cdZuchEausJKQ6KXAbBQAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqcvtLaKMKoQ508UyiY15n7RdhwBYHIAa6Bi2J9gpcMZQLnQmBQAh+QQIBgD/ACwAAAAADwAPAAACJoSPqcvtLqJcIsir7MVI73hInmaFQOBhAlJ9VAoq7cZUZEmF61EAACH5BAgGAP8ALAAAAAAPAA8AAAIphI+py+0uYmQi2BuEsrJrlHnSIYWi9nGRaXyA2i2VKJujMndBMwO9UQAAIfkECAYA/wAsAAAAAA8ADwAAAiWEj6nL7Q+BmFQsEbLOKtSfeB9lUNkoWsY5pQo2qggMdvHVmnIBACH5BAgGAP8ALAAAAAAPAA8AAAImhI+py+0PgZhULBGyzirXGVgG+JWjVwYJilFdaK7llLRzTcHtUQAAIfkECAYA/wAsAAAAAA8ADwAAAiaEj6nL7Q+BCLQKNYXe4aK8hQkYagbXaRR5kOKYvnDpwVbGTGcNFAAh+QQIBgD/ACwAAAAADwAPAAACKoSPqcuNAiNUIkiZ6o3Zamh1W0B5oPZ82yEAKtayJleuzEACQb5MbmwoAAAh+QQIBgD/ACwAAAAADwAPAAACJ4SPqZsSAqNysYr2LFQhW+55oBaMVpl05ORFaNrFD7MB9XIdOa0jBQAh+QQIBgD/ACwAAAAADwAPAAACKYSPecItCkRwTU1aUbgUcu5xTWCJDJlsGKqZkiJt8gRFLAs9hl73flIAACH5BAgGAP8ALAAAAAAPAA8AAAImhI95EuKvnoSoTXqCZXjp6yDcBQjiNwWKxrJK2bpvKc70Yuf6/hYAIfkECAYA/wAsAAAAAA8ADwAAAiaEj3nCLQpEcE1NWlG4FHLucU2QSGK2bBiZbK4LRWccLXR953pSAAAh+QQIBgD/ACwAAAAADwAPAAACJoSPqZvi75QIECZaX8N1ce5xT7CJGjKZ0RW0LsWQxroIBy0x+lIAADs=',
        'data:,Hello World!'
      ];
      _base64Pictures.forEach(img => {
        image.parseBase64Picture(img, function (err, imgDescriptor) {
          assert(err === 'Error base64 picture: the picture regex has failled. The data-uri is not valid.');
          helper.assert(imgDescriptor+'', 'undefined');
        });
      });
      done();
    });
    it('[ERROR test] should return an empty descriptor with an error because the data-uri content is empty', function (done) {
      const _base64Picture = 'data:image/jpeg;base64,';
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err === 'Error base64 picture: the picture is empty.');
        helper.assert(imgDescriptor+'', 'undefined');
        done();
      });
    });
    it('[ERROR test] should return an empty descriptor with an error because the data-uri mime type is invalid', function (done) {
      const _base64Picture = 'data:image/error-here;base64,';
      image.parseBase64Picture(_base64Picture, function (err, imgDescriptor) {
        assert(err === 'Error base64 picture: The mime type has not been recognized.');
        helper.assert(imgDescriptor+'', 'undefined');
        done();
      });
    });
  });
  describe('Test downloadImage function', function () {
    it('should download a JPEG image from an url', function (done) {
      nock('https://google.com')
        .get('/image-flag-fr.jpg')
        .replyWithFile(200, __dirname + '/datasets/image/imageFR.jpg', {
          'Content-Type' : 'image/jpeg',
        });
      image.downloadImage('https://google.com/image-flag-fr.jpg', {}, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.data.length > 0);
        helper.assert(imageInfo.mimetype, 'image/jpeg');
        helper.assert(imageInfo.extension, 'jpg');
        done();
      });
    });
    it('should download a PNG image from an url', function (done) {
      nock('https://google.com')
        .get('/image-flag-it.png')
        .replyWithFile(200, __dirname + '/datasets/image/imageIT.png', {
          'Content-Type' : 'image/png',
        });
      image.downloadImage('https://google.com/image-flag-it.png', {}, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.data.length > 0);
        helper.assert(imageInfo.mimetype, 'image/png');
        helper.assert(imageInfo.extension, 'png');
        done();
      });
    });
    it('should download a PNG image from an url with query parameters', function (done) {
      nock('https://google.com')
        .get('/image-flag-it.png?size=10&color=blue')
        .replyWithFile(200, __dirname + '/datasets/image/imageIT.png', {
          'Content-Type' : 'image/png',
        });
      image.downloadImage('https://google.com/image-flag-it.png?size=10&color=blue', {}, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.data.length > 0);
        helper.assert(imageInfo.mimetype, 'image/png');
        helper.assert(imageInfo.extension, 'png');
        done();
      });
    });
    it('should download a PNG image from an url even if the header.content-type is incorrect (application/json)', function (done) {
      nock('https://google.com')
        .get('/image-flag-it.png')
        .replyWithFile(200, __dirname + '/datasets/image/imageIT.png', {
          'Content-Type' : 'application/json',
        });
      image.downloadImage('https://google.com/image-flag-it.png', {}, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.data.length > 0);
        helper.assert(imageInfo.mimetype, 'image/png');
        helper.assert(imageInfo.extension, 'png');
        done();
      });
    });
    it('should download a JPEG image from an url even if the header.content-type is incorrect (text/plain)', function (done) {
      nock('https://google.com')
        .get('/image-flag-fr.jpg')
        .replyWithFile(200, __dirname + '/datasets/image/imageFR.jpg', {
          'Content-Type' : 'text/plain',
        });
      image.downloadImage('https://google.com/image-flag-fr.jpg', {}, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.data.length > 0);
        helper.assert(imageInfo.mimetype, 'image/jpeg');
        helper.assert(imageInfo.extension, 'jpg');
        done();
      });
    });

    it('should return an error if the file is not an image with undefined Content-Type', function (done) {
      nock('https://google.com')
        .get('/image-flag-fr.txt')
        .replyWithFile(200, __dirname + '/datasets/image/imageFR_base64_jpg.txt');
      image.downloadImage('https://google.com/image-flag-fr.txt', {}, function (err, imageInfo) {
        assert(err.includes('Error Carbone: the file is not an image'));
        assert(imageInfo+'' === 'undefined');
        done();
      });
    });

    it('should return an error when the imageLinkOrBase64 is either undefined, null or empty', function (done) {
      image.downloadImage(undefined, {}, function (err, imageInfo) {
        assert(err.includes('Carbone error: the image URL or Base64 is undefined.'));
        helper.assert(imageInfo+'', 'undefined');

        image.downloadImage(null, {}, function (err, imageInfo) {
          assert(err.includes('Carbone error: the image URL or Base64 is undefined.'));
          helper.assert(imageInfo+'', 'undefined');

          image.downloadImage('', {}, function (err, imageInfo) {
            assert(err.includes('Carbone error: the image URL or Base64 is undefined.'));
            helper.assert(imageInfo+'', 'undefined');
            done();
          });
        });
      });
    });

    it ('should return an error when the location url does not exist', function (done) {
      image.downloadImage('https://carbone.io/fowjfioewj', {}, function (err, imageInfo) {
        assert(err.includes('can not download the image from the url'));
        helper.assert(imageInfo+'', 'undefined');
        done();
      });
    });

    it('should return an error when imageLinkOrBase64 argument is invalid (the error is returned by image.parseBase64Picture)', function (done) {
      image.downloadImage('this_is_random_text', {}, function (err, imageInfo) {
        assert(err.includes('Error'));
        helper.assert(imageInfo+'', 'undefined');
        done();
      });
    });


    it('should return an error when the request timeout', function (done) {
      const errorCode = 'ETIMEDOUT';
      nock('https://google.com')
        .get('/random-image.jpeg')
        .replyWithError({code : errorCode});
      image.downloadImage('https://google.com/random-image.jpeg', {}, function (err, imageInfo) {
        helper.assert(err.code, errorCode);
        assert(imageInfo+'', 'undefined');
        done();
      });
    });

    it('[depreciated base64 img] should return an image descriptor from JPEG base64', function (done) {
      const data = {
        $base64dog : {
          data      : '/9j/4AAQSkZJRgABAQEASABIAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/+EAjEV4aWYAAE1NACoAAAAIAAUBEgADAAAAAQABAAABGgAFAAAAAQAAAEoBGwAFAAAAAQAAAFIBKAADAAAAAQACAACHaQAEAAAAAQAAAFoAAAAAAAAASAAAAAEAAABIAAAAAQADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAANoAMABAAAAAEAAAAMAAAAAP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/bAEMBBQUFBwYHDggIDh4UERQeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHv/AABEIAAwADQMBIgACEQEDEQH/xAAWAAEBAQAAAAAAAAAAAAAAAAAHBAj/xAAkEAACAgEDBAMBAQAAAAAAAAABAgMEBQYREgAHCBQTISIxof/EABQBAQAAAAAAAAAAAAAAAAAAAAX/xAAaEQABBQEAAAAAAAAAAAAAAAADAAECESEj/9oADAMBAAIRAxEAPwCnutPmNc+Qt/Sdm4fXr2fRx8T2fghib1kkD/YILbuxOw5MPyOPS1496Q1ZpnS93FX9QVSfZEyLA/sxoGUDiqsqmP7Xcj+EtuOs497MLWwPc3O4+tPbsxwWYWR7c5llPJEI5Of0xXcAMSW2Ubk9JHjXhMRlaedsZSibk6zRJ8r2pgxUc9h+XA/zosU7O9JAkebbmL//2Q==',
          extension : 'jpeg'
        }
      };
      image.downloadImage('$base64dog', data, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.mimetype === 'image/jpeg');
        assert(imageInfo.extension === 'jpeg');
        assert(imageInfo.data.length > 0);
        done();
      });
    });

    it('[depreciated base64 img] should return an image descriptor from BMP base64', function (done) {
      const data = {
        $base64cat : {
          data      : 'Qk2aAAAAAAAAADYAAAAoAAAABQAAAPv///8BACAAAAAAAAAAAAATCwAAEwsAAAAAAAAAAAAASTny/0Rp9f9Vq+H/nruq/66zqf9IefL/Sz3z/0R18P+OssH/t6qo/0KJ9P8/ePD/QgD5/z6l4/+otKj/Zara/4+6uP9EpuH/n6S8/8pxpP9kv8j/lrir/5DBr//FlKX/xUSr/w==',
          extension : 'bmp'
        }
      };
      image.downloadImage('$base64cat', data, function (err, imageInfo) {
        helper.assert(err+'', 'null');
        assert(imageInfo.mimetype === 'image/bmp');
        assert(imageInfo.extension === 'bmp');
        assert(imageInfo.data.length > 0);
        done();
      });
    });

    it('[depreciated base64 img] should return an error because the base64 is TXT file', function (done) {
      const data = {
        $base64dog : {
          data      : '/9j/4AAQSkZJRgABAQEASABIAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/+EAjEV4aWYAAE1NACoAAAAIAAUBEgADAAAAAQABAAABGgAFAAAAAQAAAEoBGwAFAAAAAQAAAFIBKAADAAAAAQACAACHaQAEAAAAAQAAAFoAAAAAAAAASAAAAAEAAABIAAAAAQADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAANoAMABAAAAAEAAAAMAAAAAP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/bAEMBBQUFBwYHDggIDh4UERQeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHv/AABEIAAwADQMBIgACEQEDEQH/xAAWAAEBAQAAAAAAAAAAAAAAAAAHBAj/xAAkEAACAgEDBAMBAQAAAAAAAAABAgMEBQYREgAHCBQTISIxof/EABQBAQAAAAAAAAAAAAAAAAAAAAX/xAAaEQABBQEAAAAAAAAAAAAAAAADAAECESEj/9oADAMBAAIRAxEAPwCnutPmNc+Qt/Sdm4fXr2fRx8T2fghib1kkD/YILbuxOw5MPyOPS1496Q1ZpnS93FX9QVSfZEyLA/sxoGUDiqsqmP7Xcj+EtuOs497MLWwPc3O4+tPbsxwWYWR7c5llPJEI5Of0xXcAMSW2Ubk9JHjXhMRlaedsZSibk6zRJ8r2pgxUc9h+XA/zosU7O9JAkebbmL//2Q==',
          extension : 'txt'
        }
      };
      image.downloadImage('$base64dog', data, function (err, imageInfo) {
        assert(err.includes('the base64 provided is not an image'));
        assert(imageInfo + '' === 'undefined');
        done();
      });
    });

    it('[depreciated base64 img] should return an error because the base64 data is empty', function (done) {
      const data = {
        $base64dog : {
          data      : '',
          extension : 'jpeg'
        }
      };
      image.downloadImage('$base64dog', data, function (err, imageInfo) {
        assert(err.includes('the base64 provided is empty'));
        assert(imageInfo + '' === 'undefined');
        done();
      });
    });
  });
});

function openTemplate (template, getHiddenFiles = false) {
  return openUnzippedDocument(template, 'template', getHiddenFiles);
}

function assertFullReport (carboneResult, expectedDirname, getHiddenFiles = false) {
  var _expected = openUnzippedDocument(expectedDirname, 'expected', getHiddenFiles);
  var _max = Math.max(carboneResult.files.length, _expected.files.length);
  for (var i = 0; i < _max; i++) {
    var _resultFile   = carboneResult.files[i];
    var _expectedFile = _expected.files[i];
    if (_resultFile.name !== _expectedFile.name) {
      for (var j = 0; j < _expected.files.length; j++) {
        _expectedFile = _expected.files[j];
        if (_resultFile.name === _expectedFile.name) {
          break;
        }
      }
    }
    assert.strictEqual(_resultFile.name, _expectedFile.name);
    if (Buffer.isBuffer(_resultFile.data) === true) {
      if (_resultFile.data.equals(_expectedFile.data) === false) {
        throw Error ('Buffer of (result) '+_resultFile.name + 'is not the same as (expected) '+_expectedFile.name);
      }
    }
    else {
      // re-indent xml to make the comparison understandable
      _resultFile.data = xmlFormat(_resultFile.data.replace(/(\r\n|\n|\r)/g,' '));
      _expectedFile.data = xmlFormat(_expectedFile.data.replace(/(\r\n|\n|\r)/g,' '));
      if (_resultFile.data !== _expectedFile.data) {
        console.log('\n\n----------------------');
        console.log(_resultFile.name + ' !== ' +  _expectedFile.name);
        console.log('----------------------\n\n');
        assert.strictEqual(_resultFile.data, _expectedFile.data);
      }
    }
  }
}

function openUnzippedDocument (dirname, type, getHiddenFiles = false) {
  var _dirname = path.join(__dirname, 'datasets', 'image', dirname, type);
  var _files = helper.walkDirSync(_dirname, getHiddenFiles === true ? /.*/ : undefined);
  var _report = {
    isZipped   : false,
    filename   : dirname,
    embeddings : [],
    files      : []
  };
  _files.forEach(file => {
    var _data = fs.readFileSync(file);
    var _extname = path.extname(file);
    var _file = {
      name     : path.relative(_dirname, file),
      data     : _data,
      isMarked : false,
      parent   : ''
    };
    if (_extname === '.xml' || _extname === '.rels') {
      _file.data = _data.toString();
      _file.isMarked = true;
    }
    _report.files.push(_file);
  });
  return _report;
}
