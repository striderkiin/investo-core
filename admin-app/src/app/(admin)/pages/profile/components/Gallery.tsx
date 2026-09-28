import { Col, Row } from 'react-bootstrap'
import Image from 'next/image'
import GlightBox from '@/components/GlightBox'

import cardImg1 from '@/assets/images/extra/card/img-1.jpg'
import cardImg2 from '@/assets/images/extra/card/img-2.jpg'
import cardImg3 from '@/assets/images/extra/card/img-3.jpg'
import cardImg4 from '@/assets/images/extra/card/img-4.jpg'
import cardImg5 from '@/assets/images/extra/card/img-5.jpg'
import cardImg6 from '@/assets/images/extra/card/img-6.jpg'

const Gallery = () => {
  return (
    <Row id="grid" className="g-0 row-gap-1">
      <Col md={6} lg={4} className="picture-item">
        <GlightBox href={cardImg1.src} className="lightbox">
          <Image src={cardImg1} alt="card-image" className="img-fluid" />
        </GlightBox>
      </Col>
      <Col md={6} lg={4} className="picture-item picture-item--overlay">
        <GlightBox href={cardImg2.src} className="lightbox">
          <Image src={cardImg2} alt="card-image" className="img-fluid" />
        </GlightBox>
      </Col>
      <Col md={6} lg={4} className="picture-item">
        <GlightBox href={cardImg3.src} className="lightbox">
          <Image src={cardImg3} alt="card-image" className="img-fluid" />
        </GlightBox>
      </Col>
      <Col md={6} lg={4} className="picture-item picture-item--h2">
        <GlightBox href={cardImg4.src} className="lightbox">
          <Image src={cardImg4} alt="card-image" className="img-fluid" />
        </GlightBox>
      </Col>
      <Col md={6} lg={4} className="picture-item">
        <GlightBox href={cardImg5.src} className="lightbox">
          <Image src={cardImg5} alt="card-image" className="img-fluid" />
        </GlightBox>
      </Col>
      <Col md={6} lg={4} className="picture-item picture-item--overlay">
        <GlightBox href={cardImg6.src} className="lightbox">
          <Image src={cardImg6} alt="card-image" className="img-fluid" />
        </GlightBox>
      </Col>
    </Row>
  )
}

export default Gallery
