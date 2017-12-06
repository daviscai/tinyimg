'use strict';

const fs = require('mz/fs');
const path = require('path');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');
const appDir = path.resolve(__dirname, '../../');
const Rsync = require('rsync');

class Api{
  constructor(ctx) {
      this.ctx = ctx;
      this.cdnDomain = '//yourhost/';

      // bno , 业务编号，代表接入服务的业务，业务白名单
      this.bno = {
          "b1" : ["host:port"]  // 业务 : 域名，可对应多个域名
      }

      this.bnoPath = {
          "b1" : "adminactniu"  // 业务 : 图片目录
      }

  }

  index(ctx){
    this.ctx.body = '基于Kone的图片压缩服务tinyimg';
    this.ctx.status = 200
  }


  /**
   * 图片压缩服务，支持png,jpg图片的压缩，支持post多张图片，压缩效果明显，失真小，肉眼很难分辨
   * http://localhost:port/upload
   *
   * post 图片
   * 必须post字段：
   * bno ， name="bno" ，业务编号，只有允许的业务才能调接口
   * 图片文件，type="file" name="image"
   *
   * post 必须是 enctype="multipart/form-data" ，否则接受不到数据
   *
   * 返回值：
   *
   * return :
   * {
   *    "error":0,
   *    "msg":"success",
   *    "data":{
   *        "urls":{
   *            "image1":"//yourhost/adminactniu/upload_ac7c001b39185cb2877e97fcc230e3d2.png",
   *            "image":"//yourhost/adminactniu/upload_63e2c1ff88a65c83107e9841742b9b42.jpg"
   *        }
   *    }
   * }
   *
   * {"error":-1,"msg":"业务编号不存在"}
   *
   * @type {[type]}
   */
  async upload(ctx) {

    //检查业务合法性
    let reqBno = ctx.req.body.bno;
    if(!Object.keys(this.bno).includes(reqBno)){
        //业务不存在
        fs.unlink(ctx.req.files.image.path);
        ctx.json(-1, '业务编号不存在');
    }

    //检查请求域名合法性
    let reqHost = ctx.req.get('host');
    if(!this.bno[reqBno].includes(reqHost)){
        //域名不存在
        fs.unlink(ctx.req.files.image.path);
        ctx.json(-1, '业务域名不存在');
    }

    //创建目录
    let buildDir = path.join(appDir, 'uploads/build/'+this.bnoPath[reqBno]);
    try {
      await fs.mkdir(buildDir);
    } catch (err) {

    }

    let pngUploadFiles = Object.assign({});
    let jpgUploadFiles = Object.assign({});
    for(let f in ctx.req.files){
        let extname = path.extname(ctx.req.files[f].path).toLowerCase();
        if(['.png'].includes(extname)){
            // if png
            pngUploadFiles[f] = ctx.req.files[f].path;
        }else if(['.jpg','.jpeg'].includes(extname)){
            // if jpg
            jpgUploadFiles[f] = ctx.req.files[f].path;
        }
    }


    let pngUrls = await this.minPNG(pngUploadFiles, buildDir, this.bnoPath[reqBno]);
    let jpgUrls = await this.minJPEG(jpgUploadFiles, buildDir, this.bnoPath[reqBno]);
    let urls = Object.assign({}, pngUrls, jpgUrls);

    // delete source file
    this.deleteSourceFiles(jpgUploadFiles);
    this.deleteSourceFiles(pngUploadFiles);

    ctx.json(0, 'success', {"urls":urls});

  }

  // 删除压缩前的文件，只保留压缩后的文件
  deleteSourceFiles(files){
      if(files){
          for(let f in files){
              fs.unlink(files[f])
          }
      }
  }

  // 压缩png图片
  async minPNG(uploadFiles, buildDir, bnoPath){

      let tmpObj = Object.assign({});
      for(let f in uploadFiles){
          tmpObj[path.basename(uploadFiles[f])] = f;
      }

      return await imagemin(Object.values(uploadFiles), buildDir, {
        use: [
          imageminPngquant({
            quality: 90,
            speed: 5 // 1 (brute-force) to 10 (fastest) , Default: 3
          })
        ]
      }).then((files) => {
        //压缩完成，分发到cdn
        this.distributeToCDN();
        let cdnUrls = Object.assign({});
        for(let file of files){
            let imgName = path.basename(file.path);
            cdnUrls[tmpObj[imgName]] = this.cdnDomain + bnoPath + '/' + imgName ;
        }
        return cdnUrls
      });
  }

   // 压缩jpg图片
  async minJPEG(uploadFiles, buildDir, bnoPath){

      let tmpObj = Object.assign({});
      for(let f in uploadFiles){
          tmpObj[path.basename(uploadFiles[f])] = f;
      }

      return await imagemin(Object.values(uploadFiles), buildDir, {
        use: [
          imageminMozjpeg({
            quality: 80
          })
        ]
      }).then((files) => {
        //压缩完成，分发到cdn
        this.distributeToCDN();
        let cdnUrls = Object.assign({});
        for(let file of files){
            let imgName = path.basename(file.path);
            cdnUrls[tmpObj[imgName]] = this.cdnDomain + bnoPath + '/' + imgName ;
        }
        return cdnUrls
      });
  }


  //分发到cdn
  distributeToCDN() {
    let buildDir = path.join(appDir, 'uploads/build/');
    let destArr = ['user@server:/pathto/filedir/'];  // 需配置免密钥同步文件

    for(let dest of destArr){
      this.rsyncFile(buildDir, dest);
    }

  }

  // 同步文件
  rsyncFile(source, dest){
    let ctx = this.ctx;
    let rsync = new Rsync()
      .shell('ssh')
      .flags('auz')
      .source(source)
      .destination(dest);

    // Execute the command
    rsync.execute(function(err, code, cmd) {
      // we're done
      if(!err){
        // 同步成功
        ctx.log.info('rsync success : '+cmd, 'rsync_success');
      }else{
        ctx.log.error('rsync fail : '+cmd, 'rsync_fail');
      }
    });

  }

  // 上传客户端
  async client(ctx) {
    let csrf = ctx.store.get('csrf');
    await ctx.render('home/upload.tpl', {
      csrf: csrf
    });

  }

}

module.exports = Api
